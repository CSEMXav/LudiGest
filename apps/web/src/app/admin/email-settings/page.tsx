"use client";

import { useEffect, useState } from "react";

interface EmailConfig {
  reminderDaysBefore: number;
  overdueFrequencyDays: number;
  reminderSubject: string;
  reminderBody: string;
  overdueSubject: string;
  overdueBody: string;
  sessionInviteSubject: string;
  sessionInviteBody: string;
}

interface EmailLog {
  id: string;
  sentAt: string;
  typeKey: string;
  typeLabel: string;
  userEmail: string;
  userName: string;
  detail: string;
  loanActive: boolean | null;
}

const VARS_HINT = "Variables disponibles : {{userName}}, {{gameName}}, {{dueAt}}";
const SESSION_VARS_HINT = "Variables : {{userName}}, {{sessionName}}, {{sessionDate}}, {{sessionTime}}, {{sessionLocation}}, {{registerUrl}}, {{inviterName}}";

const TYPE_COLORS: Record<string, string> = {
  reminder: "bg-yellow-50 text-yellow-700",
  overdue: "bg-red-50 text-red-700",
  SESSION_INVITE: "bg-blue-50 text-blue-700",
  SESSION_REMINDER: "bg-orange-50 text-orange-700",
  GAME_REPORT: "bg-red-100 text-red-800",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Collapsible({ title, icon, defaultOpen = false, children }: { title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">{icon}</span> {title}
        </h2>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-gray-100">{children}</div>}
    </div>
  );
}

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email-config")
      .then((r) => r.json())
      .then((d) => { setConfig(d); setLoading(false); });
  }, []);

  function set(key: keyof EmailConfig, value: string | number) {
    setConfig((c) => c ? { ...c, [key]: value } : c);
    setSaved(false);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/email-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Erreur lors de l'enregistrement.");
      } else {
        setSaved(true);
      }
    } catch {
      setSaveError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  async function loadLogs() {
    if (logs.length > 0) { setLogsOpen((v) => !v); return; }
    setLogsOpen(true);
    setLogsLoading(true);
    const res = await fetch("/api/admin/email-logs");
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLogsLoading(false);
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-xl" />)}
    </div>
  );

  if (!config) return null;

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300";
  const textareaCls = `${inputCls} resize-y min-h-[100px] font-mono text-xs leading-relaxed`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres des emails de rappel</h1>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement..." : saved ? "✓ Enregistré" : saveError ? "⚠ Réessayer" : "Enregistrer"}
        </button>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{saveError}</div>
      )}

      <div className="space-y-4">

        {/* Timing */}
        <Collapsible title="Fréquence d'envoi" icon="⏱" defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
            <Field
              label="Jours avant échéance pour le rappel"
              hint="L'email de rappel sera envoyé X jours avant la date de retour."
            >
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={config.reminderDaysBefore}
                  onChange={(e) => set("reminderDaysBefore", parseInt(e.target.value) || 1)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <span className="text-sm text-gray-500">jours avant la fin</span>
              </div>
            </Field>
            <Field
              label="Fréquence des relances en retard (jours)"
              hint="Après la date limite, un email de relance sera envoyé tous les X jours."
            >
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={config.overdueFrequencyDays}
                  onChange={(e) => set("overdueFrequencyDays", parseInt(e.target.value) || 1)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                <span className="text-sm text-gray-500">jours entre chaque relance</span>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
                <span>🕛</span>
                <span>Les rappels automatiques sont envoyés chaque jour à <strong>12h00 UTC</strong> (14h en France en été, 13h en hiver).</span>
              </div>
            </div>
          </div>
        </Collapsible>

        {/* Reminder email */}
        <Collapsible title="Email de rappel avant échéance" icon="📧">
          <div className="space-y-4 mt-2">
            <Field label="Objet" hint={VARS_HINT}>
              <input
                type="text"
                value={config.reminderSubject}
                onChange={(e) => set("reminderSubject", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Corps du message" hint={VARS_HINT}>
              <textarea
                value={config.reminderBody}
                onChange={(e) => set("reminderBody", e.target.value)}
                className={textareaCls}
              />
            </Field>
          </div>
        </Collapsible>

        {/* Overdue email */}
        <Collapsible title="Email de retard après échéance" icon="⚠️">
          <div className="space-y-4 mt-2">
            <Field label="Objet" hint={VARS_HINT}>
              <input
                type="text"
                value={config.overdueSubject}
                onChange={(e) => set("overdueSubject", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Corps du message" hint={VARS_HINT}>
              <textarea
                value={config.overdueBody}
                onChange={(e) => set("overdueBody", e.target.value)}
                className={textareaCls}
              />
            </Field>
          </div>
        </Collapsible>

        {/* Session invite email */}
        <Collapsible title="Email d'invitation aux sessions" icon="🎲">
          <div className="space-y-4 mt-2">
            <p className="text-xs text-gray-400">Utilisé lors des invitations admin et des sessions privées créées par les membres.</p>
            <Field label="Objet" hint={SESSION_VARS_HINT}>
              <input
                type="text"
                value={config.sessionInviteSubject ?? ""}
                onChange={(e) => set("sessionInviteSubject", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Corps du message" hint={SESSION_VARS_HINT}>
              <textarea
                value={config.sessionInviteBody ?? ""}
                onChange={(e) => set("sessionInviteBody", e.target.value)}
                className={textareaCls}
              />
            </Field>
          </div>
        </Collapsible>

        {/* Variables reference */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 Variables disponibles dans les emails</p>
          <ul className="space-y-0.5 text-xs text-blue-600">
            <li><code className="bg-blue-100 px-1 rounded">{"{{userName}}"}</code> — Prénom et nom</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{gameName}}"}</code> — Nom du jeu emprunté</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{dueAt}}"}</code> — Date limite de retour</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{sessionName}}"}</code> — Nom de la session</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{sessionDate}}"}</code> — Date de la session</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{sessionTime}}"}</code> — Heure de début</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{sessionLocation}}"}</code> — Lieu</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{registerUrl}}"}</code> — Lien d&apos;inscription</li>
            <li><code className="bg-blue-100 px-1 rounded">{"{{inviterName}}"}</code> — Nom de la personne qui invite (sessions privées)</li>
          </ul>
        </div>

        {/* Email send history */}
        <div className="bg-white rounded-xl border border-gray-100">
          <button
            type="button"
            onClick={loadLogs}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors rounded-xl"
          >
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">📋</span> Historique des emails envoyés
            </h2>
            <span className="text-gray-400 text-sm">{logsOpen ? "▲" : "▼"}</span>
          </button>

          {logsOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
              {logsLoading ? (
                <div className="space-y-2 mt-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
              ) : logs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Aucun email enregistré.</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500">
                        <th className="text-left pb-2 pr-3 font-medium">Date</th>
                        <th className="text-left pb-2 pr-3 font-medium">Type</th>
                        <th className="text-left pb-2 pr-3 font-medium">Destinataire</th>
                        <th className="text-left pb-2 font-medium">Détail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                            {new Date(log.sentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {" "}
                            {new Date(log.sentAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${TYPE_COLORS[log.typeKey] ?? "bg-gray-100 text-gray-600"}`}>
                              {log.typeLabel}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-gray-700">{log.userEmail}</td>
                          <td className="py-2 text-gray-500 truncate max-w-[180px]">{log.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

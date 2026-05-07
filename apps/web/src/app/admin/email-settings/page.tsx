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

const VARS_HINT = "Variables : {{userName}}, {{gameName}}, {{dueAt}}";
const SESSION_VARS_HINT = "Variables : {{userName}}, {{sessionName}}, {{sessionDate}}, {{sessionTime}}, {{sessionLocation}}, {{registerUrl}}, {{inviterName}}";

const LOG_TINTS: Record<string, string> = {
  reminder:        "var(--p-ocre)",
  overdue:         "var(--p-primary)",
  SESSION_INVITE:  "var(--p-bleu)",
  SESSION_REMINDER:"var(--p-ocre)",
  GAME_REPORT:     "var(--p-primary)",
};

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
      <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--p-ink3)" }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: "var(--p-ink3)" }}>{hint}</p>}
      {children}
    </div>
  );
}

function Collapsible({ title, icon, defaultOpen = false, children }: { title: string; icon: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl" style={{ border: "1px solid var(--p-rule)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl transition-colors hover:opacity-80"
      >
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--p-ink)" }}>
          <span className="text-lg">{icon}</span> {title}
        </h2>
        <span className="text-sm" style={{ color: "var(--p-ink3)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-3" style={{ borderTop: "1px solid var(--p-rule)" }}>
          {children}
        </div>
      )}
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
      if (!res.ok) { const d = await res.json().catch(() => ({})); setSaveError(d.error ?? "Erreur."); }
      else { setSaved(true); }
    } catch { setSaveError("Erreur réseau."); }
    finally { setSaving(false); }
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
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl" style={{ background: "var(--p-card)" }} />)}
    </div>
  );

  if (!config) return null;

  const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors";

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight leading-none" style={{ color: "var(--p-ink)" }}>
            Paramètres email
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--p-ink2)" }}>
            Modèles de notifications, expéditeur, journal d'envoi
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--p-ink)" }}
        >
          {saving ? "Enregistrement..." : saved ? "✓ Enregistré" : saveError ? "⚠ Réessayer" : "Enregistrer"}
        </button>
      </div>

      {saveError && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--p-primary-soft)", color: "#7c2410" }}>{saveError}</div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
        {/* Left: email templates */}
        <section className="rounded-2xl p-6" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
          <h2 className="font-display text-xl font-bold mb-1" style={{ color: "var(--p-ink)" }}>Modèles</h2>
          <p className="text-xs mb-5" style={{ color: "var(--p-ink3)" }}>Personnalisez les emails envoyés aux membres.</p>

          <div className="space-y-3">
            <Collapsible title="Fréquence d'envoi" icon="⏱" defaultOpen>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <Field label="Rappel avant échéance" hint="Jours avant la date de retour">
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={14} value={config.reminderDaysBefore}
                      onChange={(e) => set("reminderDaysBefore", parseInt(e.target.value) || 1)}
                      className="w-20 rounded-xl px-3 py-2 text-sm focus:outline-none text-center"
                      style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                    <span className="text-sm" style={{ color: "var(--p-ink3)" }}>jours</span>
                  </div>
                </Field>
                <Field label="Fréquence relances retard" hint="Jours entre chaque relance">
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={30} value={config.overdueFrequencyDays}
                      onChange={(e) => set("overdueFrequencyDays", parseInt(e.target.value) || 1)}
                      className="w-20 rounded-xl px-3 py-2 text-sm focus:outline-none text-center"
                      style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                    <span className="text-sm" style={{ color: "var(--p-ink3)" }}>jours</span>
                  </div>
                </Field>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs" style={{ background: "var(--p-bg)", color: "var(--p-ink2)" }}>
                    🕛 Rappels automatiques à <strong style={{ color: "var(--p-ink)" }}>12h00 UTC</strong> (14h heure France en été)
                  </div>
                </div>
              </div>
            </Collapsible>

            <Collapsible title="Rappel avant échéance" icon="📧">
              <div className="space-y-3 mt-2">
                <Field label="Objet" hint={VARS_HINT}>
                  <input type="text" value={config.reminderSubject} onChange={(e) => set("reminderSubject", e.target.value)}
                    className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                </Field>
                <Field label="Corps du message">
                  <textarea value={config.reminderBody} onChange={(e) => set("reminderBody", e.target.value)} rows={4}
                    className={`${inputCls} resize-y min-h-[80px] font-mono text-xs leading-relaxed`}
                    style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                </Field>
              </div>
            </Collapsible>

            <Collapsible title="Retard après échéance" icon="⚠️">
              <div className="space-y-3 mt-2">
                <Field label="Objet" hint={VARS_HINT}>
                  <input type="text" value={config.overdueSubject} onChange={(e) => set("overdueSubject", e.target.value)}
                    className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                </Field>
                <Field label="Corps du message">
                  <textarea value={config.overdueBody} onChange={(e) => set("overdueBody", e.target.value)} rows={4}
                    className={`${inputCls} resize-y min-h-[80px] font-mono text-xs leading-relaxed`}
                    style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                </Field>
              </div>
            </Collapsible>

            <Collapsible title="Invitation aux sessions" icon="🎲">
              <div className="space-y-3 mt-2">
                <p className="text-xs" style={{ color: "var(--p-ink3)" }}>Utilisé lors des invitations admin et des sessions privées.</p>
                <Field label="Objet" hint={SESSION_VARS_HINT}>
                  <input type="text" value={config.sessionInviteSubject ?? ""} onChange={(e) => set("sessionInviteSubject", e.target.value)}
                    className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                </Field>
                <Field label="Corps du message">
                  <textarea value={config.sessionInviteBody ?? ""} onChange={(e) => set("sessionInviteBody", e.target.value)} rows={4}
                    className={`${inputCls} resize-y min-h-[80px] font-mono text-xs leading-relaxed`}
                    style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
                </Field>
              </div>
            </Collapsible>
          </div>
        </section>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Variables reference */}
          <section className="rounded-2xl p-5" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
            <h2 className="font-display text-base font-bold mb-3" style={{ color: "var(--p-ink)" }}>💡 Variables disponibles</h2>
            <ul className="space-y-1">
              {[
                ["{{userName}}", "Prénom et nom"],
                ["{{gameName}}", "Nom du jeu emprunté"],
                ["{{dueAt}}", "Date limite de retour"],
                ["{{sessionName}}", "Nom de la session"],
                ["{{sessionDate}}", "Date de la session"],
                ["{{sessionTime}}", "Heure de début"],
                ["{{sessionLocation}}", "Lieu"],
                ["{{registerUrl}}", "Lien d'inscription"],
                ["{{inviterName}}", "Nom de l'invitant (sessions privées)"],
              ].map(([v, d]) => (
                <li key={v} className="flex items-center gap-2 text-xs">
                  <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "var(--p-bg)", color: "var(--p-primary)" }}>{v}</code>
                  <span style={{ color: "var(--p-ink2)" }}>— {d}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Logs */}
          <section className="rounded-2xl" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
            <button
              type="button"
              onClick={loadLogs}
              className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-colors hover:opacity-80"
            >
              <h2 className="font-display text-base font-bold flex items-center gap-2" style={{ color: "var(--p-ink)" }}>
                <span>📋</span> Journal d'envoi
              </h2>
              <span className="text-sm" style={{ color: "var(--p-ink3)" }}>{logsOpen ? "▲" : "▼"}</span>
            </button>

            {logsOpen && (
              <div className="px-5 pb-5 pt-2" style={{ borderTop: "1px solid var(--p-rule)" }}>
                {logsLoading ? (
                  <div className="space-y-2 mt-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "var(--p-bg)" }} />)}</div>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--p-ink3)" }}>Aucun email enregistré.</p>
                ) : (
                  <div className="space-y-0">
                    {logs.map((log, i) => (
                      <div key={log.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i > 0 ? "1px solid var(--p-rule)" : "none" }}>
                        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: LOG_TINTS[log.typeKey] ?? "var(--p-ink3)" }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: "var(--p-ink)" }}>{log.detail || log.typeLabel}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>
                            {new Date(log.sentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {" "}·{" "}
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${TYPE_COLORS[log.typeKey] ?? "bg-gray-100 text-gray-600"}`}>{log.typeLabel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

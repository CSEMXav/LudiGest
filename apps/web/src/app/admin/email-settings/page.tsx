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

const VARS_HINT = "Variables disponibles : {{userName}}, {{gameName}}, {{dueAt}}";
const SESSION_VARS_HINT = "Variables : {{userName}}, {{sessionName}}, {{sessionDate}}, {{sessionTime}}, {{sessionLocation}}, {{registerUrl}}, {{inviterName}}";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    await fetch("/api/admin/email-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
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
          {saving ? "Enregistrement..." : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      <div className="space-y-6">

        {/* Timing */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">⏱</span> Fréquence d'envoi
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          </div>
        </div>

        {/* Reminder email */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📧</span> Email de rappel avant échéance
          </h2>
          <div className="space-y-4">
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
        </div>

        {/* Overdue email */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">⚠️</span> Email de retard après échéance
          </h2>
          <div className="space-y-4">
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
        </div>

        {/* Session invite email */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">🎲</span> Email d&apos;invitation aux sessions
          </h2>
          <p className="text-xs text-gray-400 mb-4">Utilisé lors des invitations admin et des sessions privées créées par les membres.</p>
          <div className="space-y-4">
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
        </div>

        {/* Preview */}
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
      </div>
    </div>
  );
}

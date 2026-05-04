"use client";

import { useEffect, useState } from "react";
import type { GameSessionDTO, GameSessionRegistrationDTO } from "@ludigest/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

type SessionForm = { name: string; date: string; location: string; startTime: string; imageUrl: string; info: string };
const emptyForm: SessionForm = { name: "", date: "", location: "", startTime: "", imageUrl: "", info: "" };

function RegistrationsModal({ session, onClose }: { session: GameSessionDTO; onClose: () => void }) {
  const [regs, setRegs] = useState<GameSessionRegistrationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/sessions/${session.id}/registrations`);
    const data = await res.json();
    setRegs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [session.id]);

  async function remove(id: string) {
    const res = await fetch(`/api/admin/sessions/${session.id}/registrations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: id }),
    });
    if (res.ok) { setMsg("Inscription supprimée."); load(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Inscrits — {session.name}</h2>
            <p className="text-xs text-gray-500">{session.registrationCount} inscrit(s)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {msg && <p className="text-green-600 text-sm mb-3">✓ {msg}</p>}
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : regs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun inscrit.</p>
          ) : (
            <div className="space-y-2">
              {regs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{r.userNickname ?? r.userName}</p>
                    <p className="text-xs text-gray-500">{r.userEmail}{r.guestName && ` · Accompagné de : ${r.guestName}`}</p>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    title="Retirer de la session"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: GameSessionDTO | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SessionForm>(
    initial
      ? {
          name: initial.name,
          date: initial.date.slice(0, 10),
          location: initial.location,
          startTime: initial.startTime,
          imageUrl: initial.imageUrl ?? "",
          info: initial.info ?? "",
        }
      : emptyForm
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof SessionForm, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/admin/sessions/${initial.id}` : "/api/admin/sessions";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) { onSave(); }
    else { const d = await res.json(); setError(d.error ?? "Erreur."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{initial ? "Modifier la session" : "Nouvelle session"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la session <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required
              placeholder="Soirée Catan, Nuit des jeux…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début <span className="text-red-500">*</span></label>
              <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu <span className="text-red-500">*</span></label>
            <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} required
              placeholder="Salle de réunion Paris, Joinville…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image (URL)</label>
            <input type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Informations complémentaires</label>
            <textarea value={form.info} onChange={(e) => set("info", e.target.value)} rows={3}
              placeholder="Détails sur la soirée, jeux prévus, nombre de places…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#C8102E] text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors text-sm">
              {loading ? "Enregistrement..." : initial ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<GameSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GameSessionDTO | null>(null);
  const [viewRegs, setViewRegs] = useState<GameSessionDTO | null>(null);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});

  async function load() {
    try {
      const res = await fetch("/api/admin/sessions");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function flash(id: string, msg: string) {
    setActionMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setActionMsg((m) => { const n = { ...m }; delete n[id]; return n; }), 3000);
  }

  async function deleteSession(s: GameSessionDTO) {
    if (!confirm(`Supprimer "${s.name}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/admin/sessions/${s.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function sendInvite(s: GameSessionDTO) {
    if (!confirm(`Envoyer une invitation par email (+ push) à TOUS les membres actifs pour "${s.name}" ?`)) return;
    flash(s.id, "Envoi en cours…");
    const res = await fetch(`/api/admin/sessions/${s.id}/invite`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      flash(s.id, `✓ ${d.emailsSent} email(s), ${d.pushSent} push envoyés`);
    } else {
      flash(s.id, "Erreur lors de l'envoi.");
    }
  }

  async function sendReminder(s: GameSessionDTO) {
    if (s.registrationCount === 0) { flash(s.id, "Aucun inscrit."); return; }
    if (!confirm(`Envoyer un rappel aux ${s.registrationCount} inscrit(s) de "${s.name}" ?`)) return;
    flash(s.id, "Envoi en cours…");
    const res = await fetch(`/api/admin/sessions/${s.id}/remind`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      flash(s.id, `✓ ${d.emailsSent} rappel(s) envoyé(s)`);
    } else {
      flash(s.id, "Erreur lors de l'envoi.");
    }
  }

  if (loading) return (
    <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl" />)}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Soirées ludiques</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          ➕ Nouvelle session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">🎲</div>
          <p className="text-gray-500">Aucune session créée pour l&apos;instant.</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="mt-4 text-[#C8102E] text-sm font-medium hover:underline"
          >
            Créer la première session
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex gap-4">
                {s.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt={s.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h2 className="font-semibold text-gray-900 text-lg">{s.name}</h2>
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex-shrink-0">
                      👥 {s.registrationCount} inscrit(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                    <span>📅 {formatDate(s.date)}</span>
                    <span>🕐 {s.startTime}</span>
                    <span>📍 {s.location}</span>
                  </div>
                  {s.info && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{s.info}</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                {actionMsg[s.id] && (
                  <span className="text-xs text-green-600 font-medium mr-1">{actionMsg[s.id]}</span>
                )}
                <div className="flex flex-wrap gap-2 ml-auto">
                  <button
                    onClick={() => setViewRegs(s)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    👥 Inscrits
                  </button>
                  <button
                    onClick={() => { setEditing(s); setShowForm(true); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => sendInvite(s)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    📧 Inviter tous
                  </button>
                  <button
                    onClick={() => sendReminder(s)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    ⏰ Rappel inscrits
                  </button>
                  <button
                    onClick={() => deleteSession(s)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SessionFormModal
          initial={editing}
          onSave={() => { setShowForm(false); setEditing(null); load(); }}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {viewRegs && (
        <RegistrationsModal session={viewRegs} onClose={() => setViewRegs(null)} />
      )}
    </div>
  );
}

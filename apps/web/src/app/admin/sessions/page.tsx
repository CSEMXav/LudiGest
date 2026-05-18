"use client";

import { useEffect, useState } from "react";
import type { GameSessionDTO, GameSessionRegistrationDTO } from "@ludigest/types";

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

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
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" style={{ border: "1px solid var(--p-rule)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--p-rule)" }}>
          <div>
            <h2 className="font-semibold" style={{ color: "var(--p-ink)" }}>Inscrits — {session.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>{session.registrationCount} inscrit(s)</p>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: "var(--p-ink3)" }}>✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {msg && <p className="text-sm mb-3" style={{ color: "var(--p-vert)" }}>✓ {msg}</p>}
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--p-bg)" }} />)}</div>
          ) : regs.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--p-ink3)" }}>Aucun inscrit.</p>
          ) : (
            <div className="space-y-2">
              {regs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl p-3 text-sm" style={{ background: "var(--p-bg)" }}>
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: "var(--p-ink)" }}>{r.userNickname ?? r.userName}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>{r.userEmail}{r.guestName && ` · Avec : ${r.guestName}`}</p>
                  </div>
                  <button onClick={() => remove(r.id)} title="Retirer" className="p-1.5 rounded-lg text-sm transition-colors hover:opacity-70" style={{ color: "var(--p-primary)" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionFormModal({ initial, onSave, onClose }: { initial?: GameSessionDTO | null; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState<SessionForm>(
    initial
      ? { name: initial.name, date: initial.date.slice(0, 10), location: initial.location, startTime: initial.startTime, imageUrl: initial.imageUrl ?? "", info: initial.info ?? "" }
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
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setLoading(false);
      if (res.ok) { onSave(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur lors de l'enregistrement."); }
    } catch { setLoading(false); setError("Erreur réseau. Veuillez réessayer."); }
  }

  const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]" style={{ border: "1px solid var(--p-rule)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--p-rule)" }}>
          <h2 className="font-semibold" style={{ color: "var(--p-ink)" }}>{initial ? "Modifier la session" : "Nouvelle session"}</h2>
          <button onClick={onClose} className="text-xl" style={{ color: "var(--p-ink3)" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Nom <span style={{ color: "var(--p-primary)" }}>*</span></label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Session Catan, Nuit des jeux…"
              className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Date <span style={{ color: "var(--p-primary)" }}>*</span></label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required
                className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Heure <span style={{ color: "var(--p-primary)" }}>*</span></label>
              <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required
                className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Lieu <span style={{ color: "var(--p-primary)" }}>*</span></label>
            <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} required placeholder="Salle de réunion…"
              className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Image (URL)</label>
            <input type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…"
              className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Informations</label>
            <textarea value={form.info} onChange={(e) => set("info", e.target.value)} rows={3} placeholder="Détails, jeux prévus, places…"
              className={`${inputCls} resize-none`} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
          </div>
          {error && <div className="rounded-xl p-3 text-sm" style={{ background: "var(--p-primary-soft)", color: "#7c2410" }}>{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors" style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}>Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-colors disabled:opacity-50" style={{ background: "var(--p-ink)" }}>
              {loading ? "Enregistrement..." : initial ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type AdminSession = GameSessionDTO & { createdByName?: string | null };

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [privateSessions, setPrivateSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminSession | null>(null);
  const [viewRegs, setViewRegs] = useState<AdminSession | null>(null);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [privateExpanded, setPrivateExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/sessions");
      const data = await res.json();
      if (data.adminSessions) {
        setSessions(Array.isArray(data.adminSessions) ? data.adminSessions : []);
        setPrivateSessions(Array.isArray(data.privateSessions) ? data.privateSessions : []);
      } else if (Array.isArray(data)) {
        setSessions(data);
        setPrivateSessions([]);
      }
    } catch {
      setSessions([]);
      setPrivateSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function flash(id: string, msg: string) {
    setActionMsg((m) => ({ ...m, [id]: msg }));
    setTimeout(() => setActionMsg((m) => { const n = { ...m }; delete n[id]; return n; }), 3000);
  }

  async function deleteSession(s: AdminSession) {
    if (!confirm(`Supprimer "${s.name}" ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/admin/sessions/${s.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function sendInvite(s: AdminSession) {
    if (!confirm(`Envoyer une invitation à TOUS les membres actifs pour "${s.name}" ?`)) return;
    flash(s.id, "Envoi en cours…");
    const res = await fetch(`/api/admin/sessions/${s.id}/invite`, { method: "POST" });
    if (res.ok) { const d = await res.json(); flash(s.id, `✓ ${d.emailsSent} email(s), ${d.pushSent} push envoyés`); }
    else { flash(s.id, "Erreur lors de l'envoi."); }
  }

  async function sendReminder(s: AdminSession) {
    if (s.registrationCount === 0) { flash(s.id, "Aucun inscrit."); return; }
    if (!confirm(`Envoyer un rappel aux ${s.registrationCount} inscrit(s) ?`)) return;
    flash(s.id, "Envoi en cours…");
    const res = await fetch(`/api/admin/sessions/${s.id}/remind`, { method: "POST" });
    if (res.ok) { const d = await res.json(); flash(s.id, `✓ ${d.emailsSent} rappel(s) envoyé(s)`); }
    else { flash(s.id, "Erreur lors de l'envoi."); }
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--p-card)" }} />)}
    </div>
  );

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = sessions.filter((s) => new Date(s.date) >= today);
  const past = sessions.filter((s) => new Date(s.date) < today);

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight leading-none" style={{ color: "var(--p-ink)" }}>
            Sessions ludiques
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--p-ink2)" }}>
            {upcoming.length} session{upcoming.length !== 1 ? "s" : ""} à venir
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: "var(--p-ink)" }}
        >
          + Nouvelle session
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
          <div className="text-4xl mb-3">🎲</div>
          <p style={{ color: "var(--p-ink3)" }}>Aucune session à venir pour l&apos;instant.</p>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="mt-4 text-sm font-semibold hover:underline" style={{ color: "var(--p-primary)" }}>
            Créer la première session
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {upcoming.map((s, idx) => {
            const tint = TINTS[idx % TINTS.length];
            const fillPct = s.maxParticipants ? Math.round((s.registrationCount / s.maxParticipants) * 100) : null;
            return (
              <div key={s.id} className="rounded-2xl" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
                <div className="flex gap-5 p-5">
                  {/* Thumbnail */}
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt={s.name} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl flex-shrink-0 flex items-center justify-center text-3xl" style={{ background: tint }}>
                      🎲
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="font-display text-xl font-bold leading-tight" style={{ color: "var(--p-ink)" }}>{s.name}</h2>
                      <span className="flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "var(--p-bg-alt)" }}>
                        👥 {s.registrationCount}{s.maxParticipants ? ` / ${s.maxParticipants}` : ""} inscrit·e·s
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--p-ink2)" }}>
                      <span>📅 <strong style={{ color: "var(--p-ink)" }}>{formatDate(s.date)}</strong></span>
                      <span>🕐 {s.startTime}</span>
                      <span>📍 {s.location}</span>
                    </div>
                    {s.info && <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--p-ink2)" }}>{s.info}</p>}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center gap-2 px-5 pb-5" style={{ paddingTop: 12, borderTop: "1px solid var(--p-rule)" }}>
                  {actionMsg[s.id] && <span className="text-xs font-semibold mr-1" style={{ color: "var(--p-vert)" }}>{actionMsg[s.id]}</span>}

                  {fillPct !== null && (
                    <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--p-bg)" }}>
                        <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: tint }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--p-ink3)" }}>{fillPct} %</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 ml-auto">
                    <button onClick={() => setViewRegs(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors" style={{ border: "1px solid var(--p-rule)", background: "#fff", color: "var(--p-ink2)" }}>👥 Inscrits</button>
                    <button onClick={() => { setEditing(s); setShowForm(true); }} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors" style={{ border: "1px solid var(--p-rule)", background: "#fff", color: "var(--p-ink2)" }}>✏️ Modifier</button>
                    <button onClick={() => sendInvite(s)} className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors" style={{ background: "var(--p-bleu)" }}>📧 Inviter tous</button>
                    <button onClick={() => sendReminder(s)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors" style={{ background: "var(--p-ocre)", color: "var(--p-ink)" }}>⏰ Rappel</button>
                    <button onClick={() => deleteSession(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors" style={{ border: "1px solid var(--p-rule)", background: "#fff", color: "var(--p-primary)" }}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historique des sessions */}
      <div className="mt-6">
        <button
          onClick={() => setHistoryExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-colors"
          style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">📂</span>
            <span className="font-display font-bold text-base" style={{ color: "var(--p-ink)" }}>Historique des sessions</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--p-bg-alt)", color: "var(--p-ink2)" }}>{past.length}</span>
          </div>
          <span className="text-sm" style={{ color: "var(--p-ink3)" }}>{historyExpanded ? "▲" : "▼"}</span>
        </button>

        {historyExpanded && (
          <div className="mt-3 space-y-3">
            {past.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: "var(--p-ink3)" }}>Aucune session passée.</p>
            ) : (
              past.map((s) => (
                <div key={s.id} className="rounded-2xl p-5" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h2 className="font-semibold" style={{ color: "var(--p-ink)" }}>{s.name}</h2>
                    <span className="flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "var(--p-bg)", color: "var(--p-ink2)" }}>
                      👥 {s.registrationCount}{s.maxParticipants ? ` / ${s.maxParticipants}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs mt-2" style={{ color: "var(--p-ink3)" }}>
                    <span>📅 {formatDate(s.date)}</span>
                    <span>🕐 {s.startTime}</span>
                    <span>📍 {s.location}</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 justify-end" style={{ borderTop: "1px solid var(--p-rule)" }}>
                    <button onClick={() => setViewRegs(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink2)" }}>👥 Inscrits</button>
                    <button onClick={() => deleteSession(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-primary)" }}>🗑 Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sessions privées */}
      <div className="mt-6">
        <button
          onClick={() => setPrivateExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-colors"
          style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🔒</span>
            <span className="font-display font-bold text-base" style={{ color: "var(--p-ink)" }}>Sessions privées des membres</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--p-bleu)", color: "#fff" }}>{privateSessions.length}</span>
          </div>
          <span className="text-sm" style={{ color: "var(--p-ink3)" }}>{privateExpanded ? "▲" : "▼"}</span>
        </button>

        {privateExpanded && (
          <div className="mt-3 space-y-3">
            {privateSessions.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: "var(--p-ink3)" }}>Aucune session privée.</p>
            ) : (
              privateSessions.map((s) => (
                <div key={s.id} className="rounded-2xl p-5" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <h2 className="font-semibold" style={{ color: "var(--p-ink)" }}>{s.name}</h2>
                      {s.createdByName && <p className="text-xs mt-0.5" style={{ color: "var(--p-bleu)" }}>par {s.createdByName}</p>}
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "var(--p-bg)", color: "var(--p-ink2)" }}>
                      👥 {s.registrationCount}{s.maxParticipants ? ` / ${s.maxParticipants}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs mt-2" style={{ color: "var(--p-ink3)" }}>
                    <span>📅 {formatDate(s.date)}</span>
                    <span>🕐 {s.startTime}</span>
                    <span>📍 {s.location}</span>
                  </div>
                  {s.info && <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--p-ink2)" }}>{s.info}</p>}
                  <div className="flex gap-2 mt-3 pt-3 justify-end" style={{ borderTop: "1px solid var(--p-rule)" }}>
                    <button onClick={() => setViewRegs(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink2)" }}>👥 Inscrits</button>
                    <button onClick={() => deleteSession(s)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-primary)" }}>🗑 Supprimer</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showForm && (
        <SessionFormModal
          initial={editing}
          onSave={() => { setShowForm(false); setEditing(null); load(); }}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {viewRegs && <RegistrationsModal session={viewRegs} onClose={() => setViewRegs(null)} />}
    </div>
  );
}

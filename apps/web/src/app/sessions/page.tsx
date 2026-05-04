"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GameSessionDTO, PrivateSessionInvitationDTO } from "@ludigest/types";
import { Navbar } from "@/components/Navbar";

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isPast(iso: string) { return new Date(iso) < new Date(); }

interface Member { id: string; nickname: string; }

interface CreateSessionForm {
  name: string;
  date: string;
  location: string;
  startTime: string;
  imageUrl: string;
  info: string;
  maxParticipants: string;
}

const EMPTY_FORM: CreateSessionForm = {
  name: "", date: "", location: "", startTime: "", imageUrl: "", info: "", maxParticipants: "",
};

export default function SessionsPage() {
  const { data: authSession } = useSession();
  const userId = (authSession?.user as { id?: string })?.id;

  const [sessions, setSessions] = useState<GameSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSession, setActionSession] = useState<GameSessionDTO | null>(null);
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  // Create private session modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSessionForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal (for creator)
  const [editSession, setEditSession] = useState<GameSessionDTO | null>(null);
  const [editForm, setEditForm] = useState<CreateSessionForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Invite modal (for creator)
  const [inviteSession, setInviteSession] = useState<GameSessionDTO | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<PrivateSessionInvitationDTO[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviting, setInviting] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/user/notifications/read-sessions", { method: "POST" }).catch(() => {});
  }, []);

  function flash(id: string, text: string, ok: boolean) {
    setMsg({ id, text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  async function register(s: GameSessionDTO) {
    setSubmitting(true);
    const res = await fetch(`/api/sessions/${s.id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestName: guestName.trim() || null }),
    });
    setSubmitting(false);
    setActionSession(null);
    setGuestName("");
    if (res.ok) { flash(s.id, "Inscription enregistrée !", true); load(); }
    else { const d = await res.json(); flash(s.id, d.error ?? "Erreur.", false); }
  }

  async function unregister(s: GameSessionDTO) {
    if (!confirm("Se désinscrire de cette session ?")) return;
    setSubmitting(true);
    const res = await fetch(`/api/sessions/${s.id}/register`, { method: "DELETE" });
    setSubmitting(false);
    if (res.ok) { flash(s.id, "Désinscription effectuée.", true); load(); }
    else { flash(s.id, "Erreur.", false); }
  }

  async function declineInvitation(s: GameSessionDTO) {
    if (!userId) return;
    const res = await fetch(`/api/sessions/${s.id}/invitations/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DECLINED" }),
    });
    if (res.ok) { flash(s.id, "Invitation refusée.", true); load(); }
    else { flash(s.id, "Erreur.", false); }
  }

  async function createPrivateSession() {
    if (!createForm.name || !createForm.date || !createForm.location || !createForm.startTime) return;
    setCreating(true);
    setCreateError("");
    const body: Record<string, unknown> = {
      name: createForm.name,
      date: createForm.date,
      location: createForm.location,
      startTime: createForm.startTime,
      isPrivate: true,
    };
    if (createForm.imageUrl) body.imageUrl = createForm.imageUrl;
    if (createForm.info) body.info = createForm.info;
    if (createForm.maxParticipants) body.maxParticipants = parseInt(createForm.maxParticipants);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setCreating(false);
      if (res.ok) {
        setShowCreate(false);
        setCreateForm(EMPTY_FORM);
        setCreateError("");
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setCreateError(d.error ?? "Erreur lors de la création.");
      }
    } catch {
      setCreating(false);
      setCreateError("Erreur réseau. Veuillez réessayer.");
    }
  }

  function openEditModal(s: GameSessionDTO) {
    setEditSession(s);
    setEditError("");
    setEditForm({
      name: s.name,
      date: s.date.slice(0, 10),
      location: s.location,
      startTime: s.startTime,
      imageUrl: s.imageUrl ?? "",
      info: s.info ?? "",
      maxParticipants: s.maxParticipants ? String(s.maxParticipants) : "",
    });
  }

  async function saveEdit() {
    if (!editSession || !editForm.name || !editForm.date || !editForm.location || !editForm.startTime) return;
    setEditing(true);
    setEditError("");
    const body: Record<string, unknown> = {
      name: editForm.name,
      date: editForm.date,
      location: editForm.location,
      startTime: editForm.startTime,
      imageUrl: editForm.imageUrl || null,
      info: editForm.info || null,
      maxParticipants: editForm.maxParticipants ? parseInt(editForm.maxParticipants) : null,
    };
    try {
      const res = await fetch(`/api/sessions/${editSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditing(false);
      if (res.ok) {
        setEditSession(null);
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        setEditError(d.error ?? "Erreur lors de la mise à jour.");
      }
    } catch {
      setEditing(false);
      setEditError("Erreur réseau.");
    }
  }

  async function openInviteModal(s: GameSessionDTO) {
    setInviteSession(s);
    setSelectedUserIds(new Set());
    setLoadingMembers(true);
    const [membersRes, invRes] = await Promise.all([
      fetch("/api/members"),
      fetch(`/api/sessions/${s.id}/invitations`),
    ]);
    const membersData = await membersRes.json();
    const invData = await invRes.json();
    setMembers(Array.isArray(membersData) ? membersData.filter((m: Member) => m.id !== userId) : []);
    setInvitations(Array.isArray(invData) ? invData : []);
    setLoadingMembers(false);
  }

  async function sendInvitations() {
    if (!inviteSession || selectedUserIds.size === 0) return;
    setInviting(true);
    await fetch(`/api/sessions/${inviteSession.id}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
    });
    setInviting(false);
    // Refresh invitations list
    const invRes = await fetch(`/api/sessions/${inviteSession.id}/invitations`);
    const invData = await invRes.json();
    setInvitations(Array.isArray(invData) ? invData : []);
    setSelectedUserIds(new Set());
    load();
  }

  async function removeInvitation(sessionId: string, targetUserId: string) {
    await fetch(`/api/sessions/${sessionId}/invitations/${targetUserId}`, { method: "DELETE" });
    setInvitations((prev) => prev.filter((inv) => inv.userId !== targetUserId));
    load();
  }

  const upcoming = sessions.filter((s) => !isPast(s.date));
  const past = sessions.filter((s) => isPast(s.date));

  const alreadyInvitedIds = new Set(invitations.map((inv) => inv.userId));

  function SessionCard({ s, index }: { s: GameSessionDTO; index: number }) {
    const registered = !!s.myRegistration;
    const isCreator = s.isCreator;
    const isPrivate = s.isPrivate;
    const myInvStatus = s.myInvitation?.status;
    const isPending = isPrivate && !isCreator && myInvStatus === "PENDING";
    const isDeclined = isPrivate && myInvStatus === "DECLINED";
    const isFull = !!(s.maxParticipants && s.registrationCount >= s.maxParticipants);
    const tint = TINTS[index % TINTS.length];

    return (
      <div className="rounded-2xl overflow-hidden flex" style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}>
        {/* Colored left band */}
        <div className="w-3 flex-shrink-0" style={{ background: tint }} />
        <div className="flex-1 min-w-0">
          {s.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.imageUrl} alt={s.name} className="w-full h-40 object-cover" />
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "#ede9fe", color: "#5b21b6" }}>
                    🔒 Privée
                  </span>
                )}
                {isCreator && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}>
                    ✏️ Ma session
                  </span>
                )}
                <h2 className="font-semibold text-lg" style={{ color: "var(--p-ink)", fontFamily: "var(--font-display, system-ui)" }}>{s.name}</h2>
              </div>
              <div className="flex gap-2 flex-wrap">
                {registered && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "#e8f4ec", color: "#3a6a3e" }}>
                    ✓ Inscrit(e)
                  </span>
                )}
                {isPending && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "#fef3c7", color: "#92400e" }}>
                    📩 Invité(e)
                  </span>
                )}
                {isDeclined && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "var(--p-rule)", color: "var(--p-ink3)" }}>
                    ✗ Refusé(e)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm mb-2" style={{ color: "var(--p-ink2)" }}>
              <span>📅 {formatDate(s.date)}</span>
              <span>🕐 {s.startTime}</span>
              <span>📍 {s.location}</span>
              <span className="font-medium" style={{ color: isFull ? "var(--p-primary)" : "var(--p-ink2)" }}>
                👥 {s.registrationCount} inscrit(s){s.maxParticipants ? ` / ${s.maxParticipants}` : ""}
                {isFull && (
                  <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}>Complet</span>
                )}
              </span>
            </div>

            {s.myRegistration?.guestName && (
              <p className="text-sm mb-2" style={{ color: "var(--p-ink3)" }}>Accompagné(e) de : <strong style={{ color: "var(--p-ink2)" }}>{s.myRegistration.guestName}</strong></p>
            )}
            {s.info && <p className="text-sm mb-3" style={{ color: "var(--p-ink3)" }}>{s.info}</p>}

            {msg?.id === s.id && (
              <p className="text-sm mb-3 font-medium" style={{ color: msg.ok ? "#3a6a3e" : "var(--p-primary)" }}>{msg.text}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {registered ? (
                <button
                  onClick={() => unregister(s)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  style={{ border: "1.5px solid var(--p-primary-soft)", color: "var(--p-primary)" }}
                >
                  Se désinscrire
                </button>
              ) : isFull && !registered ? (
                <span className="px-4 py-2 text-sm font-medium rounded-xl cursor-not-allowed"
                  style={{ background: "var(--p-rule)", color: "var(--p-ink3)" }}>
                  Session complète
                </span>
              ) : isPending ? (
                <>
                  {actionSession?.id === s.id ? (
                    <div className="space-y-3 w-full">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: "var(--p-ink2)" }}>Accompagnant(e) ? (optionnel)</label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Prénom Nom"
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                          style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setActionSession(null); setGuestName(""); }}
                          className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                          style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}>Annuler</button>
                        <button onClick={() => register(s)} disabled={submitting}
                          className="px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
                          style={{ background: tint }}>{submitting ? "…" : "Confirmer"}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { setActionSession(s); setGuestName(""); }}
                        className="px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors"
                        style={{ background: tint }}
                      >
                        S&apos;inscrire
                      </button>
                      <button
                        onClick={() => declineInvitation(s)}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                        style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}
                      >
                        Refuser
                      </button>
                    </>
                  )}
                </>
              ) : !isPrivate || isCreator ? (
                actionSession?.id === s.id ? (
                  <div className="space-y-3 w-full">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--p-ink2)" }}>Accompagnant(e) ? (optionnel)</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Prénom Nom de l'accompagnant"
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setActionSession(null); setGuestName(""); }}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                        style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}>Annuler</button>
                      <button onClick={() => register(s)} disabled={submitting}
                        className="px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
                        style={{ background: "var(--p-primary)" }}>{submitting ? "…" : "Confirmer l'inscription"}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setActionSession(s); setGuestName(""); }}
                    className="px-4 py-2 text-sm font-medium rounded-xl text-white transition-colors"
                    style={{ background: "var(--p-primary)" }}
                  >
                    S&apos;inscrire
                  </button>
                )
              ) : null}

              {isCreator && (
                <>
                  <button
                    onClick={() => openEditModal(s)}
                    className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                    style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => openInviteModal(s)}
                    className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                    style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}
                  >
                    👥 Invitations
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--p-ink)", fontFamily: "var(--font-display, system-ui)" }}>🎲 Sessions ludiques</h1>
          <button
            onClick={() => { setShowCreate(true); setCreateForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--p-ink)" }}
          >
            🔒 Créer une session privée
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--p-card)" }} />)}</div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}>
            <div className="text-4xl mb-3">🎲</div>
            <p style={{ color: "var(--p-ink3)" }}>Aucune session prévue pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-4 mb-8">
                {upcoming.map((s, i) => <SessionCard key={s.id} s={s} index={i} />)}
              </div>
            )}
            {past.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--p-ink2)" }}>Sessions passées</h2>
                <div className="space-y-3">
                  {past.map((s, i) => (
                    <div key={s.id} className="rounded-xl p-4 opacity-70"
                      style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {s.isPrivate && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: "#ede9fe", color: "#5b21b6" }}>🔒 Privée</span>
                          )}
                          <h3 className="font-medium" style={{ color: "var(--p-ink2)" }}>{s.name}</h3>
                        </div>
                        <span className="text-xs" style={{ color: "var(--p-ink3)" }}>👥 {s.registrationCount} inscrit(s)</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs mt-1" style={{ color: "var(--p-ink3)" }}>
                        <span>📅 {formatDate(s.date)}</span>
                        <span>📍 {s.location}</span>
                        {s.myRegistration && <span style={{ color: "#3a6a3e" }}>✓ Vous étiez inscrit(e)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Create private session modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">🔒 Créer une session privée</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la session *</label>
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" placeholder="Ex : Session Catan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu *</label>
                  <input type="text" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" placeholder="Ex : Salle communale" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Places max (optionnel)</label>
                  <input type="number" min={1} value={createForm.maxParticipants} onChange={(e) => setCreateForm({ ...createForm, maxParticipants: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" placeholder="Illimité si vide" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optionnel)</label>
                  <input type="url" value={createForm.imageUrl} onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                  <textarea value={createForm.info} onChange={(e) => setCreateForm({ ...createForm, info: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none resize-y min-h-[80px]" placeholder="Informations complémentaires…" />
                </div>
              </div>
              {createError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{createError}</div>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
                <button
                  onClick={createPrivateSession}
                  disabled={creating || !createForm.name || !createForm.date || !createForm.location || !createForm.startTime}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
                  style={{ background: "var(--p-primary)" }}
                >
                  {creating ? "Création…" : "Créer la session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit session modal (creator only) */}
      {editSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">✏️ Modifier la session</h2>
                <button onClick={() => setEditSession(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la session *</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu *</label>
                  <input type="text" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Places max</label>
                  <input type="number" min={1} value={editForm.maxParticipants} onChange={(e) => setEditForm({ ...editForm, maxParticipants: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" placeholder="Illimité si vide" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input type="url" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={editForm.info} onChange={(e) => setEditForm({ ...editForm, info: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:outline-none resize-y min-h-[80px]" />
                </div>
              </div>
              <p className="text-xs text-indigo-600 mt-3">Les participants inscrits recevront un email avec les nouvelles informations.</p>
              {editError && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{editError}</div>}
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setEditSession(null); setEditError(""); }} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
                <button
                  onClick={saveEdit}
                  disabled={editing || !editForm.name || !editForm.date || !editForm.location || !editForm.startTime}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
                  style={{ background: "var(--p-primary)" }}
                >
                  {editing ? "Mise à jour…" : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitations management modal (creator only) */}
      {inviteSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">👥 Invitations — {inviteSession.name}</h2>
                <button onClick={() => setInviteSession(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>

              {/* Current invitations */}
              {invitations.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Invitations envoyées</h3>
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{inv.nickname}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            inv.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                            inv.status === "DECLINED" ? "bg-red-100 text-red-600" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                            {inv.status === "ACCEPTED" ? "✓ Accepté" : inv.status === "DECLINED" ? "✗ Refusé" : "En attente"}
                          </span>
                        </div>
                        <button
                          onClick={() => removeInvitation(inviteSession.id, inv.userId)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite new members */}
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Inviter des membres</h3>
              {loadingMembers ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}</div>
              ) : (
                <>
                  <div className="space-y-1 max-h-52 overflow-y-auto border border-gray-200 rounded-xl p-2">
                    {members.filter((m) => !alreadyInvitedIds.has(m.id)).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">Tous les membres ont déjà été invités.</p>
                    ) : (
                      members.filter((m) => !alreadyInvitedIds.has(m.id)).map((m) => (
                        <label key={m.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(m.id)}
                            onChange={(e) => {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(m.id); else next.delete(m.id);
                                return next;
                              });
                            }}
                            className="rounded border-gray-300 text-purple-600"
                          />
                          <span className="text-sm text-gray-800">{m.nickname}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedUserIds.size > 0 && (
                    <button
                      onClick={sendInvitations}
                      disabled={inviting}
                      className="w-full mt-3 py-2.5 text-sm font-medium rounded-xl text-white transition-colors disabled:opacity-50"
                      style={{ background: "var(--p-primary)" }}
                    >
                      {inviting ? "Envoi…" : `Envoyer ${selectedUserIds.size} invitation(s)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

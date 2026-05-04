"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GameSessionDTO, PrivateSessionInvitationDTO } from "@ludigest/types";
import { Navbar } from "@/components/Navbar";

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

  function SessionCard({ s }: { s: GameSessionDTO }) {
    const registered = !!s.myRegistration;
    const isCreator = s.isCreator;
    const isPrivate = s.isPrivate;
    const myInvStatus = s.myInvitation?.status;
    const isPending = isPrivate && !isCreator && myInvStatus === "PENDING";
    const isDeclined = isPrivate && myInvStatus === "DECLINED";

    const borderColor = isPrivate
      ? "border-purple-200"
      : registered
      ? "border-green-200"
      : "border-gray-100";

    return (
      <div className={`bg-white rounded-2xl shadow-sm border-2 ${borderColor} overflow-hidden`}>
        {s.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imageUrl} alt={s.name} className="w-full h-40 object-cover" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isPrivate && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  🔒 Privée
                </span>
              )}
              {isCreator && (
                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  ✏️ Ma session
                </span>
              )}
              <h2 className="font-semibold text-gray-900 text-lg">{s.name}</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              {registered && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  ✓ Inscrit(e)
                </span>
              )}
              {isPending && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                  📩 Invité(e)
                </span>
              )}
              {isDeclined && (
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-medium">
                  ✗ Refusé(e)
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
            <span>📅 {formatDate(s.date)}</span>
            <span>🕐 {s.startTime}</span>
            <span>📍 {s.location}</span>
            <span className="font-medium text-blue-600">👥 {s.registrationCount} inscrit(s){s.maxParticipants ? ` / ${s.maxParticipants}` : ""}</span>
          </div>

          {s.myRegistration?.guestName && (
            <p className="text-sm text-gray-500 mb-2">Accompagné(e) de : <strong>{s.myRegistration.guestName}</strong></p>
          )}
          {s.info && <p className="text-sm text-gray-500 mb-3">{s.info}</p>}

          {msg?.id === s.id && (
            <p className={`text-sm mb-3 font-medium ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {registered ? (
              <button
                onClick={() => unregister(s)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Se désinscrire
              </button>
            ) : isPending ? (
              <>
                {actionSession?.id === s.id ? (
                  <div className="space-y-3 w-full">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Accompagnant(e) ? (optionnel)</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Prénom Nom"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setActionSession(null); setGuestName(""); }} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
                      <button onClick={() => register(s)} disabled={submitting} className="px-4 py-2 text-sm font-medium rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50">{submitting ? "…" : "Confirmer"}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setActionSession(s); setGuestName(""); }}
                      className="px-4 py-2 text-sm font-medium rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      S&apos;inscrire
                    </button>
                    <button
                      onClick={() => declineInvitation(s)}
                      className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">Accompagnant(e) ? (optionnel)</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Prénom Nom de l'accompagnant"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setActionSession(null); setGuestName(""); }} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
                    <button onClick={() => register(s)} disabled={submitting} className="px-4 py-2 text-sm font-medium rounded-xl bg-[#C8102E] text-white hover:bg-red-700 transition-colors disabled:opacity-50">{submitting ? "…" : "Confirmer l'inscription"}</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setActionSession(s); setGuestName(""); }}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-[#C8102E] text-white hover:bg-red-700 transition-colors"
                >
                  S&apos;inscrire
                </button>
              )
            ) : null}

            {isCreator && (
              <button
                onClick={() => openInviteModal(s)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors"
              >
                👥 Gérer les invitations
              </button>
            )}
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
          <h1 className="text-2xl font-bold text-gray-900">🎲 Sessions ludiques</h1>
          <button
            onClick={() => { setShowCreate(true); setCreateForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            🔒 Créer une session privée
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">🎲</div>
            <p className="text-gray-500">Aucune session prévue pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-4 mb-8">
                {upcoming.map((s) => <SessionCard key={s.id} s={s} />)}
              </div>
            )}
            {past.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-600 mb-3">Sessions passées</h2>
                <div className="space-y-3">
                  {past.map((s) => (
                    <div key={s.id} className={`bg-gray-50 rounded-xl border-2 ${s.isPrivate ? "border-purple-100" : "border-gray-100"} p-4 opacity-70`}>
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {s.isPrivate && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">🔒 Privée</span>}
                          <h3 className="font-medium text-gray-700">{s.name}</h3>
                        </div>
                        <span className="text-xs text-gray-400">👥 {s.registrationCount} inscrit(s)</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-1">
                        <span>📅 {formatDate(s.date)}</span>
                        <span>📍 {s.location}</span>
                        {s.myRegistration && <span className="text-green-500">✓ Vous étiez inscrit(e)</span>}
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
                  <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Ex : Session Catan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure *</label>
                    <input type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu *</label>
                  <input type="text" value={createForm.location} onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Ex : Salle communale" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Places max (optionnel)</label>
                  <input type="number" min={1} value={createForm.maxParticipants} onChange={(e) => setCreateForm({ ...createForm, maxParticipants: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="Illimité si vide" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optionnel)</label>
                  <input type="url" value={createForm.imageUrl} onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                  <textarea value={createForm.info} onChange={(e) => setCreateForm({ ...createForm, info: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-y min-h-[80px]" placeholder="Informations complémentaires…" />
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
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {creating ? "Création…" : "Créer la session"}
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
                      className="w-full mt-3 py-2.5 text-sm font-medium rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
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

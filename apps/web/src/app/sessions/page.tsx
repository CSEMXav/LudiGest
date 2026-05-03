"use client";

import { useEffect, useState } from "react";
import type { GameSessionDTO } from "@ludigest/types";
import { Navbar } from "@/components/Navbar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isPast(iso: string) { return new Date(iso) < new Date(); }

export default function SessionsPage() {
  const [sessions, setSessions] = useState<GameSessionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionSession, setActionSession] = useState<GameSessionDTO | null>(null);
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  async function load() {
    const res = await fetch("/api/sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Mark session notifications as read when user opens this page
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

  const upcoming = sessions.filter((s) => !isPast(s.date));
  const past = sessions.filter((s) => isPast(s.date));

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🎲 Sessions ludiques</h1>

        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-4xl mb-3">🎲</div>
            <p className="text-gray-500">Aucune soirée prévue pour l&apos;instant.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-4 mb-8">
                {upcoming.map((s) => {
                  const registered = !!s.myRegistration;
                  return (
                    <div key={s.id} className={`bg-white rounded-2xl shadow-sm border ${registered ? "border-green-200" : "border-gray-100"} overflow-hidden`}>
                      {s.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.imageUrl} alt={s.name} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                          <h2 className="font-semibold text-gray-900 text-lg">{s.name}</h2>
                          {registered && (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                              ✓ Inscrit(e)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                          <span>📅 {formatDate(s.date)}</span>
                          <span>🕐 {s.startTime}</span>
                          <span>📍 {s.location}</span>
                          <span className="font-medium text-blue-600">👥 {s.registrationCount} inscrit(s)</span>
                        </div>
                        {s.myRegistration?.guestName && (
                          <p className="text-sm text-gray-500 mb-2">Accompagné(e) de : <strong>{s.myRegistration.guestName}</strong></p>
                        )}
                        {s.info && <p className="text-sm text-gray-500 mb-3">{s.info}</p>}

                        {msg?.id === s.id && (
                          <p className={`text-sm mb-3 font-medium ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
                        )}

                        {registered ? (
                          <button
                            onClick={() => unregister(s)}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Se désinscrire
                          </button>
                        ) : actionSession?.id === s.id ? (
                          <div className="space-y-3">
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
                              <button
                                onClick={() => { setActionSession(null); setGuestName(""); }}
                                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => register(s)}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium rounded-xl bg-[#C8102E] text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                {submitting ? "…" : "Confirmer l'inscription"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setActionSession(s); setGuestName(""); }}
                            className="px-4 py-2 text-sm font-medium rounded-xl bg-[#C8102E] text-white hover:bg-red-700 transition-colors"
                          >
                            S&apos;inscrire
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {past.length > 0 && (
              <>
                <h2 className="text-lg font-semibold text-gray-600 mb-3">Sessions passées</h2>
                <div className="space-y-3">
                  {past.map((s) => (
                    <div key={s.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 opacity-70">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-700">{s.name}</h3>
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
    </>
  );
}

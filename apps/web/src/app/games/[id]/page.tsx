"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { RatingForm } from "@/components/RatingForm";
import type { RatingDTO } from "@ludigest/types";

interface GameDetail {
  id: string;
  name: string;
  type: string;
  category: string;
  summary?: string | null;
  minAge?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  duration?: number | null;
  coverUrl?: string | null;
  status: "AVAILABLE" | "BORROWED" | "SUSPENDED";
  addedAt: string;
  averageRating?: number | null;
  ratingsCount: number;
  ratings: RatingDTO[];
  activeLoan?: { dueAt: string; isCurrentUser: boolean } | null;
}

interface LoanHistoryItem {
  id: string;
  userName: string;
  userEmail: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  extendedCount: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  escape:   { label: "Escape",   color: "#d24a1f" },
  famille:  { label: "Famille",  color: "#e8a82f" },
  ambiance: { label: "Ambiance", color: "#286b7a" },
  enfant:   { label: "Enfant",   color: "#f4c430" },
  "initié": { label: "Initié",   color: "#5b4d40" },
  expert:   { label: "Expert",   color: "#6a8f3c" },
};

const STATUS_LABELS = { AVAILABLE: "Disponible", BORROWED: "Emprunté", SUSPENDED: "Suspendu" };
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  AVAILABLE: { background: "#e8f4ec", color: "#3a6a3e" },
  BORROWED:  { background: "rgba(30,22,16,.12)", color: "#1e1610" },
  SUSPENDED: { background: "var(--p-rule)", color: "var(--p-ink3)" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function HistoryModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [history, setHistory] = useState<LoanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${gameId}/history`)
      .then((r) => r.json())
      .then((d) => { setHistory(Array.isArray(d) ? d : []); setLoading(false); });
  }, [gameId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historique des emprunts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun emprunt enregistré.</p>
          ) : (
            <div className="space-y-3">
              {history.map((l) => (
                <div key={l.id} className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{l.userName}</span>
                    {l.returnedAt ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Rendu</span>
                    ) : (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">En cours</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">
                    Du {formatDate(l.borrowedAt)}
                    {l.returnedAt ? ` au ${formatDate(l.returnedAt)}` : ` · À rendre le ${formatDate(l.dueAt)}`}
                    {l.extendedCount > 0 && <span className="ml-1 text-blue-600">(prolongé {l.extendedCount}x)</span>}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{l.userEmail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportModal({ gameId, gameName, onClose }: { gameId: string; gameName: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSending(true);
    await fetch(`/api/games/${gameId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setSending(false);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">🚨 Signaler un problème</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">
          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✓</div>
              <p className="text-green-700 font-medium">Signalement envoyé aux administrateurs.</p>
              <button onClick={onClose} className="mt-4 text-sm text-gray-500 hover:underline">Fermer</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-3">Jeu : <strong>{gameName}</strong></p>
              <p className="text-xs text-gray-400 mb-2">Pièces manquantes, boîte abîmée, jeu détérioré…</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Décrivez le problème..."
                rows={4}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm"
                  style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}>Annuler</button>
                <button
                  onClick={submit}
                  disabled={sending || !text.trim()}
                  className="flex-1 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ background: "var(--p-primary)" }}
                >
                  {sending ? "Envoi..." : "Envoyer le signalement"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface GameReportItem {
  id: string;
  reporterName: string;
  message: string;
  createdAt: string;
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reports, setReports] = useState<GameReportItem[]>([]);
  const [showReportList, setShowReportList] = useState(false);

  const isAdmin = session?.user.role === "ADMIN";

  async function loadGame() {
    const res = await fetch(`/api/games/${id}`);
    if (!res.ok) { router.push("/games"); return; }
    setGame(await res.json());
    setLoading(false);
  }

  async function loadReports() {
    const res = await fetch(`/api/games/${id}/reports`);
    if (res.ok) setReports(await res.json());
  }

  useEffect(() => { loadGame(); }, [id]);
  useEffect(() => { if (isAdmin) loadReports(); }, [id, isAdmin]);

  async function borrow() {
    setBorrowing(true);
    setMessage("");
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: id }),
    });
    setBorrowing(false);
    if (res.ok) {
      setMessage("Emprunt enregistré ! Vous avez 4 semaines pour le rendre.");
      loadGame();
    } else {
      const d = await res.json();
      setMessage(d.error ?? "Erreur");
    }
  }

  const myRating = game?.ratings.find((r) => r.userId === session?.user.id);

  if (loading) return <div className="animate-pulse bg-white rounded-2xl h-96" />;
  if (!game) return null;

  const cat = CATEGORY_CONFIG[game.category] ?? CATEGORY_CONFIG["famille"];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
        ← Retour
      </button>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}>
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="relative w-full md:w-72 h-72 flex-shrink-0 flex items-center justify-center"
            style={{ background: game.coverUrl ? undefined : cat.color }}>
            {game.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover" />
            ) : (
              <span style={{ fontSize: 64, opacity: 0.25 }}>🎲</span>
            )}
            <span className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-sm font-bold text-white shadow"
              style={{ background: cat.color }}>
              {cat.label}
            </span>
          </div>

          <div className="p-6 flex-1">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-2xl font-bold" style={{ color: "var(--p-ink)", fontFamily: "var(--font-display, system-ui)" }}>{game.name}</h1>
                {isAdmin && reports.length > 0 && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setShowReportList((v) => !v)}
                      className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600 transition-colors"
                      title={`${reports.length} signalement(s)`}
                    >
                      !
                    </button>
                    {showReportList && (
                      <div className="absolute right-0 top-8 z-30 w-80 bg-white border border-red-200 rounded-xl shadow-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-red-700">🚨 {reports.length} signalement(s)</p>
                          <button onClick={() => setShowReportList(false)} className="text-gray-400 hover:text-gray-600 text-sm leading-none">✕</button>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {reports.map((r) => (
                            <div key={r.id} className="bg-red-50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-gray-700 mb-0.5">{r.reporterName} · {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await fetch(`/api/games/${id}/reports/${r.id}`, { method: "DELETE" });
                                    setReports((prev) => prev.filter((x) => x.id !== r.id));
                                  }}
                                  className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0"
                                  title="Supprimer ce signalement"
                                >
                                  ✕
                                </button>
                              </div>
                              <p className="text-sm text-gray-800">{r.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-medium flex-shrink-0"
                style={STATUS_STYLES[game.status]}>
                {STATUS_LABELS[game.status]}
              </span>
            </div>

            <p className="text-sm mb-1" style={{ color: "var(--p-ink3)" }}>
              Type : <span className="font-medium" style={{ color: "var(--p-ink2)" }}>{game.type}</span>
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--p-ink3)" }}>
              Entrée à la ludothèque le {formatDate(game.addedAt)}
            </p>

            <div className="flex flex-wrap gap-4 my-3">
              {game.minPlayers && game.maxPlayers && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--p-ink2)" }}>
                  <span className="text-lg">👥</span>
                  <span>{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`} joueurs</span>
                </div>
              )}
              {game.duration && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--p-ink2)" }}>
                  <span className="text-lg">⏱</span>
                  <span>{game.duration} min</span>
                </div>
              )}
              {game.minAge && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--p-ink2)" }}>
                  <span className="text-lg">🎂</span>
                  <span>Dès {game.minAge} ans</span>
                </div>
              )}
            </div>

            {game.averageRating && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl" style={{ color: "var(--p-ocre)" }}>{"★".repeat(Math.round(game.averageRating))}</span>
                <span className="text-sm" style={{ color: "var(--p-ink3)" }}>{game.averageRating}/5 ({game.ratingsCount} avis)</span>
              </div>
            )}

            {game.summary && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--p-ink2)" }}>{game.summary}</p>
            )}

            {game.activeLoan?.isCurrentUser && (
              <p className="text-sm text-orange-600 font-medium mb-4">
                Vous avez emprunté ce jeu — à rendre avant le {formatDate(game.activeLoan.dueAt)}
              </p>
            )}

            {message && (
              <div className={`text-sm p-3 rounded-lg mb-4 ${message.startsWith("Emprunt") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {message}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {game.status === "AVAILABLE" && !game.activeLoan && (
                <button
                  onClick={borrow}
                  disabled={borrowing}
                  className="px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 transition-colors text-white"
                  style={{ background: "var(--p-primary)" }}
                >
                  {borrowing ? "Emprunt en cours..." : "Emprunter ce jeu"}
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}
                >
                  📋 Historique
                </button>
              )}
              {session && (
                <button
                  onClick={() => setShowReport(true)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: "1.5px solid var(--p-primary-soft)", color: "var(--p-primary)" }}
                >
                  🚨 Signaler un problème
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--p-ink)" }}>Avis des joueurs</h2>
        <RatingForm gameId={id} existing={myRating} onSaved={loadGame} />

        <div className="mt-6 space-y-4">
          {game.ratings.map((r) => (
            <div key={r.id} className="rounded-xl p-4" style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm" style={{ color: "var(--p-ink)" }}>{r.userName}</span>
                <span className="text-xs" style={{ color: "var(--p-ink3)" }}>{formatDate(r.createdAt)}</span>
              </div>
              <div className="text-sm mb-1" style={{ color: "var(--p-ocre)" }}>
                {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
              </div>
              {r.comment && <p className="text-sm" style={{ color: "var(--p-ink2)" }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>

      {showHistory && <HistoryModal gameId={id} onClose={() => setShowHistory(false)} />}
      {showReport && game && <ReportModal gameId={id} gameName={game.name} onClose={() => setShowReport(false)} />}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  escape:   { label: "Escape",   bg: "bg-red-500",    text: "text-white" },
  famille:  { label: "Famille",  bg: "bg-orange-400", text: "text-white" },
  ambiance: { label: "Ambiance", bg: "bg-blue-500",   text: "text-white" },
  enfant:   { label: "Enfant",   bg: "bg-yellow-400", text: "text-white" },
  "initié": { label: "Initié",   bg: "bg-gray-500",   text: "text-white" },
  expert:   { label: "Expert",   bg: "bg-green-500",  text: "text-white" },
};

const STATUS_LABELS = { AVAILABLE: "Disponible", BORROWED: "Emprunté", SUSPENDED: "Suspendu" };
const STATUS_STYLES = {
  AVAILABLE: "bg-green-100 text-green-800",
  BORROWED:  "bg-orange-100 text-orange-800",
  SUSPENDED: "bg-gray-100 text-gray-600",
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
                <button
                  onClick={submit}
                  disabled={sending || !text.trim()}
                  className="flex-1 bg-[#C8102E] text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
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

  const isAdmin = session?.user.role === "ADMIN";

  async function loadGame() {
    const res = await fetch(`/api/games/${id}`);
    if (!res.ok) { router.push("/games"); return; }
    setGame(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadGame(); }, [id]);

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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="relative w-full md:w-64 h-72 bg-gray-100 flex-shrink-0">
            {game.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-6xl text-gray-300">🎲</div>
            )}
            <span className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-sm font-bold ${cat.bg} ${cat.text} shadow`}>
              {cat.label}
            </span>
          </div>

          <div className="p-6 flex-1">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl font-bold text-gray-900">{game.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${STATUS_STYLES[game.status]}`}>
                {STATUS_LABELS[game.status]}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-1">
              Type : <span className="font-medium text-gray-700">{game.type}</span>
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Entrée à la ludothèque le {formatDate(game.addedAt)}
            </p>

            <div className="flex flex-wrap gap-4 my-3">
              {game.minPlayers && game.maxPlayers && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span className="text-lg">👥</span>
                  <span>{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`} joueurs</span>
                </div>
              )}
              {game.duration && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span className="text-lg">⏱</span>
                  <span>{game.duration} min</span>
                </div>
              )}
              {game.minAge && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span className="text-lg">🎂</span>
                  <span>Dès {game.minAge} ans</span>
                </div>
              )}
            </div>

            {game.averageRating && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-400 text-xl">{"★".repeat(Math.round(game.averageRating))}</span>
                <span className="text-sm text-gray-500">{game.averageRating}/5 ({game.ratingsCount} avis)</span>
              </div>
            )}

            {game.summary && (
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{game.summary}</p>
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
                  className="px-6 py-2.5 bg-[#C8102E] text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {borrowing ? "Emprunt en cours..." : "Emprunter ce jeu"}
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
                >
                  📋 Historique
                </button>
              )}
              {session && (
                <button
                  onClick={() => setShowReport(true)}
                  className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  🚨 Signaler un problème
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Avis des joueurs</h2>
        <RatingForm gameId={id} existing={myRating} onSaved={loadGame} />

        <div className="mt-6 space-y-4">
          {game.ratings.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{r.userName}</span>
                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
              </div>
              <div className="text-yellow-400 text-sm mb-1">
                {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
              </div>
              {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>

      {showHistory && <HistoryModal gameId={id} onClose={() => setShowHistory(false)} />}
      {showReport && game && <ReportModal gameId={id} gameName={game.name} onClose={() => setShowReport(false)} />}
    </div>
  );
}

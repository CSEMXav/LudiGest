"use client";

import { useEffect, useState } from "react";
import type { GameCategory } from "@ludigest/types";

const CATEGORIES: { value: GameCategory; label: string; color: string }[] = [
  { value: "escape",   label: "Escape",   color: "bg-red-500 text-white"    },
  { value: "famille",  label: "Famille",  color: "bg-orange-400 text-white" },
  { value: "ambiance", label: "Ambiance", color: "bg-blue-500 text-white"   },
  { value: "enfant",   label: "Enfant",   color: "bg-yellow-400 text-white" },
  { value: "initié",   label: "Initié",   color: "bg-gray-500 text-white"   },
  { value: "expert",   label: "Expert",   color: "bg-green-500 text-white"  },
];

interface Proposal {
  id: string;
  title: string;
  category: string;
  link: string | null;
  summary: string | null;
  coverUrl: string | null;
  minAge: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  duration: number | null;
  proposedBy: string;
  createdAt: string;
  upVotes: number;
  downVotes: number;
  myVote: number;
  canDelete: boolean;
}

const SORTS: { value: "score" | "recent" | "name"; label: string }[] = [
  { value: "score",  label: "Les plus appréciés" },
  { value: "recent", label: "Plus récents" },
  { value: "name",   label: "A → Z" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function hostOf(link: string) {
  try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return "Voir le lien"; }
}

export function ProposalsBoard() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"score" | "recent" | "name">("score");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GameCategory | "">("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((data) => setProposals(Array.isArray(data) ? data : []))
      .catch(() => setError("Erreur de chargement des propositions."))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    if (!title.trim() || !category) return;
    setSubmitting(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, link: link.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur lors de l'ajout."); return; }
      setProposals((list) => [d, ...list]);
      setMsg(d.infoFound ? `✓ « ${d.title} » ajouté — infos récupérées automatiquement.` : `✓ « ${d.title} » ajouté — aucune info trouvée automatiquement.`);
      setTitle(""); setCategory(""); setLink("");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(p: Proposal, value: 1 | -1) {
    setVoting((v) => ({ ...v, [p.id]: true }));
    try {
      const res = await fetch(`/api/proposals/${p.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: p.myVote === value ? 0 : value }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setProposals((list) => list.map((x) => (x.id === p.id ? d : x)));
      else setError(d.error ?? "Erreur lors du vote.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setVoting((v) => ({ ...v, [p.id]: false }));
    }
  }

  async function refresh(p: Proposal) {
    setRefreshing((r) => ({ ...r, [p.id]: true }));
    setError("");
    try {
      const res = await fetch(`/api/proposals/${p.id}/refresh`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setProposals((list) => list.map((x) => (x.id === p.id ? d : x)));
      else setError(d.error ?? "Erreur lors de la recherche d'infos.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setRefreshing((r) => ({ ...r, [p.id]: false }));
    }
  }

  async function remove(p: Proposal) {
    if (!confirm(`Supprimer la proposition "${p.title}" ?`)) return;
    const res = await fetch(`/api/proposals/${p.id}`, { method: "DELETE" });
    if (res.ok) setProposals((list) => list.filter((x) => x.id !== p.id));
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Erreur lors de la suppression."); }
  }

  const catConfig = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));
  const sorted = [...proposals].sort((a, b) => {
    if (sort === "name") return a.title.localeCompare(b.title, "fr");
    if (sort === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (b.upVotes - b.downVotes) - (a.upVotes - a.downVotes) || b.upVotes - a.upVotes;
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Futurs achats</h1>
        <p className="text-sm text-gray-500 mt-1">Proposez un jeu à acheter pour la ludothèque et votez pour les propositions.</p>
      </div>

      {/* Formulaire de proposition */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Proposer un jeu</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Titre du jeu</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              maxLength={120}
              placeholder="Ex : Harmonies, Sky Team..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Lien <span className="font-normal text-gray-400">(optionnel — page d&apos;achat ou de présentation)</span>
            </label>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              maxLength={500}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 font-mono text-xs"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-2">Catégorie</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                  category === c.value
                    ? `${c.color} border-transparent`
                    : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {msg && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            disabled={submitting || !title.trim() || !category}
            className="px-5 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Recherche des infos..." : "Valider la proposition"}
          </button>
          <span className="text-xs text-gray-400">Les infos du jeu sont recherchées automatiquement à partir du lien ou du titre.</span>
        </div>
      </div>

      {/* Liste des propositions */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <span className="text-sm font-semibold text-gray-700 mr-2">{proposals.length} proposition{proposals.length > 1 ? "s" : ""}</span>
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              sort === s.value
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-600 hover:border-gray-400 bg-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-500">
          Aucune proposition pour l&apos;instant. Soyez le premier à suggérer un jeu !
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const players = !p.minPlayers ? null
              : !p.maxPlayers ? `${p.minPlayers}+ joueurs`
              : p.minPlayers === p.maxPlayers ? `${p.minPlayers} joueur${p.minPlayers > 1 ? "s" : ""}`
              : `${p.minPlayers} à ${p.maxPlayers} joueurs`;
            const specs = [
              { icon: "👥", label: "Nombre de joueurs", value: players },
              { icon: "⏱", label: "Durée d'une partie", value: p.duration ? `${p.duration} min` : null },
              { icon: "🎂", label: "Âge conseillé", value: p.minAge ? `Dès ${p.minAge} ans` : null },
            ];
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.coverUrl}
                      alt={p.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : "🎲"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{p.title}</h3>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${catConfig[p.category]?.color ?? "bg-gray-200 text-gray-700"}`}>
                      {catConfig[p.category]?.label ?? p.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {specs.map((sp) => (
                      <span
                        key={sp.label}
                        title={sp.label}
                        className={`text-xs px-2 py-0.5 rounded-full ${sp.value ? "bg-gray-100 text-gray-700 font-medium" : "bg-gray-50 text-gray-400"}`}
                      >
                        {sp.icon} {sp.value ?? "—"}
                      </span>
                    ))}
                  </div>
                  {p.summary && <p className="text-sm text-gray-600 mt-1.5 line-clamp-3">{p.summary}</p>}
                  <div className="flex items-center gap-3 flex-wrap mt-2 text-xs text-gray-400">
                    <span>Proposé par {p.proposedBy} le {formatDate(p.createdAt)}</span>
                    {p.link && (
                      <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                        🔗 {hostOf(p.link)}
                      </a>
                    )}
                    {p.canDelete && (
                      <button
                        onClick={() => refresh(p)}
                        disabled={refreshing[p.id]}
                        title="Relancer la recherche des infos (joueurs, durée, âge, image)"
                        className="text-gray-500 hover:underline disabled:opacity-50"
                      >
                        {refreshing[p.id] ? "Recherche…" : "↻ Actualiser les infos"}
                      </button>
                    )}
                    {p.canDelete && (
                      <button onClick={() => remove(p)} className="text-red-500 hover:underline">Supprimer</button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center">
                  <button
                    onClick={() => vote(p, 1)}
                    disabled={voting[p.id]}
                    aria-pressed={p.myVote === 1}
                    title={p.myVote === 1 ? "Retirer mon vote" : "J'aimerais ce jeu"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors disabled:opacity-50 ${
                      p.myVote === 1 ? "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-700 bg-white hover:border-green-500"
                    }`}
                  >
                    👍 <span className="tabular-nums">{p.upVotes}</span>
                  </button>
                  <button
                    onClick={() => vote(p, -1)}
                    disabled={voting[p.id]}
                    aria-pressed={p.myVote === -1}
                    title={p.myVote === -1 ? "Retirer mon vote" : "Pas intéressé"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors disabled:opacity-50 ${
                      p.myVote === -1 ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-700 bg-white hover:border-red-500"
                    }`}
                  >
                    👎 <span className="tabular-nums">{p.downVotes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

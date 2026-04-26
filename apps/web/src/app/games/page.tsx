"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { GameCard, GameListRow } from "@/components/GameCard";
import type { GameDTO, GameCategory } from "@ludigest/types";

const STATUS_LABELS: Record<string, string> = {
  "": "Tous",
  AVAILABLE: "Disponibles",
  BORROWED: "Empruntés",
};

const CATEGORIES: { value: GameCategory; label: string; color: string }[] = [
  { value: "escape",   label: "Escape",   color: "bg-red-500 text-white"    },
  { value: "famille",  label: "Famille",  color: "bg-orange-400 text-white" },
  { value: "ambiance", label: "Ambiance", color: "bg-blue-500 text-white"   },
  { value: "enfant",   label: "Enfant",   color: "bg-yellow-400 text-white" },
  { value: "initié",   label: "Initié",   color: "bg-gray-500 text-white"   },
  { value: "expert",   label: "Expert",   color: "bg-green-500 text-white"  },
];

const DURATION_OPTIONS = [
  { label: "Toutes", value: "" },
  { label: "≤ 30 min", value: "30" },
  { label: "≤ 60 min", value: "60" },
  { label: "≤ 90 min", value: "90" },
  { label: "≤ 2h",    value: "120" },
  { label: "≤ 3h",    value: "180" },
];

const PLAYERS_OPTIONS = [
  { label: "Tous", value: "" },
  { label: "1",  value: "1" },
  { label: "2",  value: "2" },
  { label: "3",  value: "3" },
  { label: "4",  value: "4" },
  { label: "5",  value: "5" },
  { label: "6+", value: "6" },
];

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <rect x="1" y="1" width="7" height="7" rx="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <rect x="1" y="2"  width="16" height="3" rx="1.5" />
      <rect x="1" y="7.5" width="16" height="3" rx="1.5" />
      <rect x="1" y="13" width="16" height="3" rx="1.5" />
    </svg>
  );
}

export default function GamesPage() {
  const { data: session } = useSession();
  const [games, setGames]       = useState<GameDTO[]>([]);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [loading, setLoading]   = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  useEffect(() => {
    const stored = localStorage.getItem("gamesViewMode") as "grid" | "list" | null;
    if (stored) setViewMode(stored);
  }, []);

  const [sortBy, setSortBy] = useState("name");

  // Advanced filters
  const [category,    setCategory]    = useState("");
  const [minStars,    setMinStars]    = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [players,     setPlayers]     = useState("");
  const [fromDate,    setFromDate]    = useState("");
  const [toDate,      setToDate]      = useState("");

  const hasActiveFilters = !!(category || minStars || maxDuration || players || fromDate || toDate);

  function toggleView(mode: "grid" | "list") {
    setViewMode(mode);
    localStorage.setItem("gamesViewMode", mode);
  }

  function resetFilters() {
    setCategory(""); setMinStars(""); setMaxDuration(""); setPlayers(""); setFromDate(""); setToDate("");
  }

  const loadGames = useCallback(() => {
    const params = new URLSearchParams();
    if (search)      params.set("search", search);
    if (status)      params.set("status", status);
    if (category)    params.set("category", category);
    if (minStars)    params.set("minStars", minStars);
    if (maxDuration) params.set("maxDuration", maxDuration);
    if (players)     params.set("players", players);
    if (fromDate)    params.set("fromDate", fromDate);
    if (toDate)      params.set("toDate", toDate);

    setLoading(true);
    fetch(`/api/games?${params}`)
      .then((r) => r.json())
      .then((data) => { setGames(Array.isArray(data) ? data : []); setLoading(false); });
  }, [search, status, category, minStars, maxDuration, players, fromDate, toDate, session?.user.location]);

  useEffect(() => { loadGames(); }, [loadGames]);

  const sortedGames = [...games].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":  return a.name.localeCompare(b.name, "fr");
      case "name_desc": return b.name.localeCompare(a.name, "fr");
      case "rating":    return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      case "duration":  return (a.duration ?? 9999) - (b.duration ?? 9999);
      case "recent":    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      default:          return a.name.localeCompare(b.name, "fr");
    }
  });

  return (
    <div>
      {/* Location badge */}
      {session?.user.location && (
        <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-[#C8102E] text-sm font-semibold px-3 py-1.5 rounded-full mb-4">
          📍 {session.user.location}
        </div>
      )}

      {/* Search + status bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          placeholder="Rechercher un jeu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatus(val)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                status === val ? "bg-[#C8102E] text-white" : "bg-white border border-gray-300 text-gray-700 hover:border-red-300"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
              hasActiveFilters
                ? "bg-[#C8102E] text-white border-[#C8102E]"
                : "bg-white border-gray-300 text-gray-700 hover:border-red-300"
            }`}
          >
            ⚙ Filtres{hasActiveFilters && " ●"}
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
          >
            <option value="name_asc">Nom A→Z</option>
            <option value="name_desc">Nom Z→A</option>
            <option value="rating">Mieux notés</option>
            <option value="duration">Durée ↑</option>
            <option value="recent">Plus récents</option>
          </select>

          {/* View toggle */}
          <div className="flex border border-gray-300 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleView("grid")}
              title="Vue grille"
              className={`px-3 py-2 transition-colors ${viewMode === "grid" ? "bg-[#C8102E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => toggleView("list")}
              title="Vue liste"
              className={`px-3 py-2 border-l border-gray-300 transition-colors ${viewMode === "list" ? "bg-[#C8102E] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced filter panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-5">
          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Catégorie</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory("")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === "" ? "bg-gray-800 text-white border-gray-800" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}
              >
                Toutes
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(category === c.value ? "" : c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-opacity ${c.color} ${category && category !== c.value ? "opacity-40" : "opacity-100"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stars / Duration / Players */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Note minimale</label>
              <div className="flex gap-1">
                {["", "1", "2", "3", "4", "5"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinStars(minStars === s ? "" : s)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      minStars === s ? "bg-yellow-400 text-white border-yellow-400" : "border-gray-200 text-gray-600 hover:border-yellow-300"
                    }`}
                  >
                    {s === "" ? "—" : `${s}★`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Durée max</label>
              <div className="flex flex-wrap gap-1">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setMaxDuration(maxDuration === d.value ? "" : d.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      maxDuration === d.value ? "bg-[#C8102E] text-white border-[#C8102E]" : "border-gray-200 text-gray-600 hover:border-red-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nombre de joueurs</label>
              <div className="flex flex-wrap gap-1">
                {PLAYERS_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlayers(players === p.value ? "" : p.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      players === p.value ? "bg-[#C8102E] text-white border-[#C8102E]" : "border-gray-200 text-gray-600 hover:border-red-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entry date */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Date d&apos;entrée à la ludothèque</p>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Du</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">au</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-300"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-red-600 hover:underline">
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Game list */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl h-20 animate-pulse border border-gray-100" />)}
          </div>
        )
      ) : games.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎲</div>
          <p>Aucun jeu trouvé.</p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="mt-2 text-sm text-[#C8102E] hover:underline">
              Effacer les filtres
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedGames.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedGames.map((g) => <GameListRow key={g.id} game={g} />)}
        </div>
      )}
    </div>
  );
}

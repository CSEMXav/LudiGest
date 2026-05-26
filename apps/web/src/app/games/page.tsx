"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { GameCard, GameListRow } from "@/components/GameCard";
import { Pion } from "@/components/Pion";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import type { GameDTO, GameCategory } from "@ludigest/types";

const CATEGORIES: { value: GameCategory; label: string; color: string }[] = [
  { value: "escape",   label: "Escape",   color: "#d24a1f" },
  { value: "famille",  label: "Famille",  color: "#e8a82f" },
  { value: "ambiance", label: "Ambiance", color: "#286b7a" },
  { value: "enfant",   label: "Enfant",   color: "#f4c430" },
  { value: "initié",   label: "Initié",   color: "#5b4d40" },
  { value: "expert",   label: "Expert",   color: "#6a8f3c" },
];

const DURATION_OPTIONS: { label: string; value: string; min?: number; max?: number }[] = [
  { label: "Toutes",     value: ""       },
  { label: "< 30min",   value: "lt30",   max: 29  },
  { label: "30–60min",  value: "30to60", min: 30, max: 60 },
  { label: "1h et +",   value: "gte60",  min: 60  },
  { label: "2h et +",   value: "gte120", min: 120 },
];

const PLAYERS_OPTIONS = [
  { label: "Tous", value: "" },
  { label: "1",   value: "1" },
  { label: "2",   value: "2" },
  { label: "3",   value: "3" },
  { label: "4",   value: "4" },
  { label: "5",   value: "5" },
  { label: "6+",  value: "6" },
];

interface GameGroup {
  key: string;
  representative: GameDTO;
  copies: GameDTO[];
  availableCount: number;
  totalCount: number;
}

function groupByName(games: GameDTO[]): GameGroup[] {
  const map = new Map<string, GameDTO[]>();
  for (const g of games) {
    const key = g.name.toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }
  return Array.from(map.values()).map((copies) => {
    const availableCount = copies.filter((c) => c.status === "AVAILABLE").length;
    const representative = copies.find((c) => c.status === "AVAILABLE") ?? copies[0];
    return { key: representative.name.toLowerCase().trim(), representative, copies, availableCount, totalCount: copies.length };
  });
}

function CopiesModal({ group, onClose }: { group: GameGroup; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{group.representative.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{group.totalCount} exemplaires en bibliothèque</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="divide-y divide-gray-100">
          {group.copies.map((copy, i) => (
            <a
              key={copy.id}
              href={`/games/${copy.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">Exemplaire {i + 1}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                copy.status === "AVAILABLE"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {copy.status === "AVAILABLE" ? "Disponible" : "Emprunté"}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      <rect x="1" y="2"   width="16" height="3" rx="1.5" />
      <rect x="1" y="7.5" width="16" height="3" rx="1.5" />
      <rect x="1" y="13"  width="16" height="3" rx="1.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--p-ink)" strokeWidth="1.6" />
      <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="var(--p-ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function GamesPage() {
  const { data: session } = useSession();
  const [games, setGames]           = useState<GameDTO[]>([]);
  const [search, setSearch]         = useState("");
  const [status, setStatus]         = useState("AVAILABLE");
  const [loading, setLoading]       = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");
  const [dense, setDense]           = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("gamesViewMode") as "grid" | "list" | null;
    if (stored) setViewMode(stored);
    const storedDense = localStorage.getItem("gamesDense");
    if (storedDense) setDense(storedDense === "true");
  }, []);

  const [sortBy,          setSortBy]          = useState("name_asc");
  const [category,        setCategory]        = useState("");
  const [minStars,        setMinStars]        = useState("");
  const [durationFilter,  setDurationFilter]  = useState("");
  const [players,         setPlayers]         = useState("");
  const [fromDate,        setFromDate]        = useState("");
  const [toDate,          setToDate]          = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GameGroup | null>(null);

  const hasActiveFilters = !!(category || minStars || durationFilter || players || fromDate || toDate);

  function toggleView(mode: "grid" | "list") {
    setViewMode(mode);
    localStorage.setItem("gamesViewMode", mode);
  }

  function toggleDense() {
    setDense((v) => { localStorage.setItem("gamesDense", String(!v)); return !v; });
  }

  function resetFilters() {
    setCategory(""); setMinStars(""); setDurationFilter(""); setPlayers(""); setFromDate(""); setToDate("");
  }

  const loadGames = useCallback(() => {
    const params = new URLSearchParams();
    if (search)      params.set("search", search);
    if (status)      params.set("status", status);
    if (category)    params.set("category", category);
    if (minStars)    params.set("minStars", minStars);
    if (durationFilter) {
      const opt = DURATION_OPTIONS.find((d) => d.value === durationFilter);
      if (opt?.min) params.set("minDuration", String(opt.min));
      if (opt?.max) params.set("maxDuration", String(opt.max));
    }
    if (players)     params.set("players", players);
    if (fromDate)    params.set("fromDate", fromDate);
    if (toDate)      params.set("toDate", toDate);

    setLoading(true);
    fetch(`/api/games?${params}`)
      .then((r) => r.json())
      .then((data) => { setGames(Array.isArray(data) ? data : []); setLoading(false); });
  }, [search, status, category, minStars, durationFilter, players, fromDate, toDate, session?.user.location]);

  useEffect(() => { loadGames(); }, [loadGames]);

  const sortedGames = [...games].sort((a, b) => {
    switch (sortBy) {
      case "name_desc": return b.name.localeCompare(a.name, "fr");
      case "rating":    return (b.averageRating ?? 0) - (a.averageRating ?? 0);
      case "duration":  return (a.duration ?? 9999) - (b.duration ?? 9999);
      case "recent":    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      default:          return a.name.localeCompare(b.name, "fr");
    }
  });

  const grouped = groupByName(sortedGames);
  const available = games.filter((g) => g.status === "AVAILABLE").length;
  const borrowed  = games.filter((g) => g.status === "BORROWED").length;

  const cols = viewMode === "grid"
    ? (dense ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")
    : "";

  return (
    <div className="px-4 sm:px-8 py-7 max-w-[1280px] mx-auto">

      {/* ── Bloc titre ── */}
      <div className="flex items-end justify-between gap-6 mb-[22px]">
        <div>
          <h1
            className="font-display font-bold leading-none"
            style={{ fontSize: 40, letterSpacing: -1.2, color: "var(--p-ink)" }}
          >
            Catalogue
          </h1>
          <p className="text-[13px] mt-2" style={{ color: "var(--p-ink2)" }}>
            <strong style={{ color: "var(--p-ink)" }}>{available} jeux disponibles</strong>
            {borrowed > 0 && <> · {borrowed} empruntés</>}
            {games.length > 0 && <> · {grouped.length} titre{grouped.length > 1 ? "s" : ""} affiché{grouped.length > 1 ? "s" : ""}</>}
          </p>
        </div>
        <a
          href="/comment-ca-marche"
          className="text-[11px] hover:opacity-70 transition-opacity flex-shrink-0 hidden sm:block"
          style={{ color: "var(--p-ink3)", textDecoration: "underline" }}
        >
          Comment ça marche ?
        </a>
      </div>

      {/* ── Barre recherche + filtres rapides ── */}
      <div className="flex items-center gap-[10px] mb-[14px] flex-wrap">

        {/* Champ recherche */}
        <div className="relative flex-1 min-w-[240px]">
          <SearchIcon />
          <input
            type="search"
            placeholder="Rechercher un jeu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full focus:outline-none text-[13px]"
            style={{
              height: 44,
              padding: "0 16px 0 40px",
              border: "1.5px solid var(--p-ink)",
              borderRadius: 100,
              background: "#fff",
              color: "var(--p-ink)",
            }}
          />
        </div>

        {/* Pills statut */}
        {(["", "AVAILABLE", "BORROWED"] as const).map((val) => {
          const labels: Record<string, string> = { "": "Tous", AVAILABLE: "Disponibles", BORROWED: "Empruntés" };
          const active = status === val;
          return (
            <button
              key={val}
              onClick={() => setStatus(val)}
              className="text-[13px] font-semibold transition-colors"
              style={{
                height: 44, padding: "0 16px", borderRadius: 100,
                border: `1.5px solid ${active ? "var(--p-ink)" : "var(--p-rule)"}`,
                background: active ? "var(--p-ink)" : "#fff",
                color: active ? "#fff" : "var(--p-ink2)",
              }}
            >
              {labels[val]}
            </button>
          );
        })}

        {/* Bouton filtres */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold transition-colors"
          style={{
            height: 44, padding: "0 16px", borderRadius: 100,
            border: `1.5px solid ${hasActiveFilters ? "var(--p-primary)" : "var(--p-primary)"}`,
            background: "var(--p-primary)",
            color: "#fff",
          }}
        >
          ⚙ Filtres
          {hasActiveFilters && <span style={{ width: 6, height: 6, background: "#fff", borderRadius: 6, display: "inline-block" }} />}
        </button>

        {/* Select tri */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="focus:outline-none cursor-pointer font-semibold text-[13px]"
          style={{
            height: 44, padding: "0 14px", borderRadius: 100,
            border: "1.5px solid var(--p-rule)", background: "#fff",
            color: "var(--p-ink2)",
          }}
        >
          <option value="name_asc">Nom A→Z</option>
          <option value="name_desc">Nom Z→A</option>
          <option value="rating">Mieux notés</option>
          <option value="duration">Durée ↑</option>
          <option value="recent">Plus récents</option>
        </select>

        {/* Scanner */}
        <button
          onClick={() => setShowScanner(true)}
          title="Scanner un code-barres"
          className="inline-flex items-center gap-2 text-[13px] font-semibold transition-colors"
          style={{
            height: 44, padding: "0 16px", borderRadius: 100,
            border: "1.5px solid var(--p-rule)", background: "#fff",
            color: "var(--p-ink2)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="8" x2="7" y2="16" /><line x1="10" y1="8" x2="10" y2="16" />
            <line x1="13" y1="8" x2="13" y2="16" /><line x1="16" y1="8" x2="16" y2="16" />
          </svg>
          <span className="hidden sm:inline">Scanner</span>
        </button>

        {/* Toggle vue + densité */}
        <div className="flex overflow-hidden" style={{ border: "1.5px solid var(--p-rule)", borderRadius: 100 }}>
          <button
            onClick={() => toggleView("grid")}
            title="Vue grille"
            className="transition-colors"
            style={{
              width: 44, height: 44,
              background: viewMode === "grid" ? "var(--p-primary)" : "#fff",
              color: viewMode === "grid" ? "#fff" : "var(--p-ink3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <GridIcon />
          </button>
          <button
            onClick={() => toggleView("list")}
            title="Vue liste"
            className="transition-colors"
            style={{
              width: 44, height: 44,
              background: viewMode === "list" ? "var(--p-primary)" : "#fff",
              color: viewMode === "list" ? "#fff" : "var(--p-ink3)",
              borderLeft: "1.5px solid var(--p-rule)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ListIcon />
          </button>
          {viewMode === "grid" && (
            <button
              onClick={toggleDense}
              title={dense ? "Vue normale" : "Vue compacte"}
              className="text-xs font-bold transition-colors px-3"
              style={{
                height: 44,
                background: dense ? "var(--p-ink)" : "#fff",
                color: dense ? "#fff" : "var(--p-ink3)",
                borderLeft: "1.5px solid var(--p-rule)",
              }}
            >
              {dense ? "5×" : "4×"}
            </button>
          )}
        </div>
      </div>

      {/* ── Panneau filtres avancés ── */}
      {showFilters && (
        <div
          className="p-5 mb-[22px] space-y-5"
          style={{ background: "#fff", border: "1.5px solid var(--p-rule)", borderRadius: 18 }}
        >
          {/* Catégorie */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-[10px]" style={{ letterSpacing: "0.06em", color: "var(--p-ink3)" }}>
              Catégorie
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCategory("")}
                className="px-[14px] py-[6px] rounded-full text-xs font-semibold transition-opacity"
                style={category === ""
                  ? { background: "var(--p-ink)", color: "#fff", border: "none" }
                  : { background: "#fff", color: "var(--p-ink2)", border: "1.5px solid var(--p-rule)" }}
              >
                Toutes
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(category === c.value ? "" : c.value)}
                  className="px-[14px] py-[6px] rounded-full text-xs font-semibold transition-opacity"
                  style={{
                    background: c.color, color: "#fff", border: "none",
                    opacity: category && category !== c.value ? 0.4 : 1,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note / Durée / Joueurs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.4fr", gap: 24 }} className="max-sm:grid max-sm:!grid-cols-1">
            {/* Note */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ letterSpacing: "0.06em", color: "var(--p-ink3)" }}>
                Note minimale
              </p>
              <div className="flex gap-1">
                {["", "1", "2", "3", "4", "5"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinStars(minStars === s ? "" : s)}
                    className="flex-1 py-[7px] rounded-lg text-[11px] font-semibold transition-colors"
                    style={minStars === s
                      ? { background: "var(--p-ocre)", color: "#fff", border: `1px solid var(--p-ocre)` }
                      : { border: "1px solid var(--p-rule)", color: "var(--p-ink2)", background: "#fff" }}
                  >
                    {s === "" ? "—" : `${s}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Durée */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ letterSpacing: "0.06em", color: "var(--p-ink3)" }}>
                Durée
              </p>
              <div className="flex flex-wrap gap-1">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDurationFilter(durationFilter === d.value ? "" : d.value)}
                    className="px-3 py-[7px] rounded-lg text-[11px] font-semibold transition-colors"
                    style={durationFilter === d.value
                      ? { background: "var(--p-primary)", color: "#fff", border: `1px solid var(--p-primary)` }
                      : { border: "1px solid var(--p-rule)", color: "var(--p-ink2)", background: "#fff" }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Joueurs */}
            <div>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ letterSpacing: "0.06em", color: "var(--p-ink3)" }}>
                Joueurs
              </p>
              <div className="flex gap-1">
                {PLAYERS_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPlayers(players === p.value ? "" : p.value)}
                    className="flex-1 py-[7px] rounded-lg text-[11px] font-semibold transition-colors"
                    style={players === p.value
                      ? { background: "var(--p-ink)", color: "#fff", border: `1px solid var(--p-ink)` }
                      : { border: "1px solid var(--p-rule)", color: "var(--p-ink2)", background: "#fff" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ letterSpacing: "0.06em", color: "var(--p-ink3)" }}>
              Date d&apos;entrée
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: "var(--p-ink3)" }}>Du</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink)" }} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: "var(--p-ink3)" }}>au</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink)" }} />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs hover:underline" style={{ color: "var(--p-primary)" }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* ── Grille / liste ── */}
      {loading ? (
        viewMode === "grid" ? (
          <div className={`grid ${cols} gap-4`}>
            {[...Array(dense ? 10 : 8)].map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ height: dense ? 240 : 280, background: "var(--p-card)", border: "1.5px solid #f0eee9" }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-xl h-[70px] animate-pulse"
                style={{ background: "var(--p-card)", border: "1.5px solid #f0eee9" }} />
            ))}
          </div>
        )
      ) : grouped.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-4" style={{ color: "var(--p-ink3)" }}>
          <Pion tint="#9a8b7c" kind="meeple" w={80} h={80} />
          <p className="text-base">Aucun jeu trouvé.</p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-sm hover:underline" style={{ color: "var(--p-primary)" }}>
              Effacer les filtres
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className={`grid ${cols} gap-4`}>
          {grouped.map((group) => (
            <div key={group.key} className="relative">
              <GameCard game={group.representative} dense={dense} />
              {group.totalCount > 1 && (
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="absolute top-2 left-2 z-10 flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md transition-opacity hover:opacity-80"
                  style={{ background: group.availableCount > 0 ? "#1e1610" : "#C8102E" }}
                >
                  {group.availableCount}/{group.totalCount} ex.
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {grouped.map((group) => (
            <div key={group.key} className="relative">
              <GameListRow game={group.representative} />
              {group.totalCount > 1 && (
                <button
                  onClick={() => setSelectedGroup(group)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md transition-opacity hover:opacity-80"
                  style={{ background: group.availableCount > 0 ? "#1e1610" : "#C8102E" }}
                >
                  {group.availableCount}/{group.totalCount} ex.
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showScanner && <BarcodeScannerModal onClose={() => setShowScanner(false)} />}
      {selectedGroup && <CopiesModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
    </div>
  );
}

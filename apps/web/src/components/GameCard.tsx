"use client";

import Link from "next/link";
import type { GameDTO, GameCategory } from "@ludigest/types";

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  escape:   { label: "Escape",   bg: "bg-red-500",    text: "text-white", border: "border-l-4 border-l-red-500" },
  famille:  { label: "Famille",  bg: "bg-orange-400", text: "text-white", border: "border-l-4 border-l-orange-400" },
  ambiance: { label: "Ambiance", bg: "bg-blue-500",   text: "text-white", border: "border-l-4 border-l-blue-500" },
  enfant:   { label: "Enfant",   bg: "bg-yellow-400", text: "text-white", border: "border-l-4 border-l-yellow-400" },
  "initié": { label: "Initié",   bg: "bg-gray-500",   text: "text-white", border: "border-l-4 border-l-gray-500" },
  expert:   { label: "Expert",   bg: "bg-green-500",  text: "text-white", border: "border-l-4 border-l-green-500" },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG["famille"];
}

function StatusBadge({ status }: { status: GameDTO["status"] }) {
  const styles: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    BORROWED: "bg-orange-100 text-orange-800",
    SUSPENDED: "bg-gray-100 text-gray-600",
  };
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    BORROWED: "Emprunté",
    SUSPENDED: "Suspendu",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function GameListRow({ game }: { game: GameDTO }) {
  const cat = getCategoryConfig(game.category);

  return (
    <Link href={`/games/${game.id}`} className="block">
      <div className={`bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4 p-3 ${cat.border}`}>
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          {game.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="flex items-center justify-center h-full text-2xl text-gray-300">🎲</div>
          )}
        </div>

        {/* Category badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${cat.bg} ${cat.text}`}>
          {cat.label}
        </span>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{game.name}</p>
          <p className="text-xs text-gray-500 truncate">{game.type}</p>
        </div>

        {/* Players + duration */}
        <div className="hidden sm:flex gap-4 text-xs text-gray-500 flex-shrink-0">
          {game.minPlayers && game.maxPlayers && (
            <span>👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}</span>
          )}
          {game.duration && <span>⏱ {game.duration} min</span>}
          {game.minAge && <span>🎂 {game.minAge}+</span>}
        </div>

        {/* Rating */}
        {game.averageRating && (
          <span className="hidden md:block text-yellow-500 text-xs flex-shrink-0">
            {"★".repeat(Math.round(game.averageRating))}{"☆".repeat(5 - Math.round(game.averageRating))}
          </span>
        )}

        {/* Status */}
        <StatusBadge status={game.status} />
      </div>
    </Link>
  );
}

export function GameCard({ game }: { game: GameDTO }) {
  const cat = getCategoryConfig(game.category);

  return (
    <Link href={`/games/${game.id}`} className="block h-full">
      <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden h-full flex flex-col ${cat.border}`}>
        {/* Image */}
        <div className="relative h-44 bg-gray-100 overflow-hidden">
          {game.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.coverUrl}
              alt={game.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl text-gray-300">
              🎲
            </div>
          )}
          {/* Catégorie — badge en overlay sur l'image */}
          <span className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-xs font-bold ${cat.bg} ${cat.text} shadow-sm`}>
            {cat.label}
          </span>
        </div>

        {/* Infos */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 leading-tight text-sm">{game.name}</h3>
            <StatusBadge status={game.status} />
          </div>

          <span className="text-xs text-gray-500">{game.type}</span>

          {/* Joueurs + durée */}
          <div className="flex gap-3 text-xs text-gray-500">
            {game.minPlayers && game.maxPlayers && (
              <span>👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`} joueurs</span>
            )}
            {game.duration && <span>⏱ {game.duration} min</span>}
          </div>

          {game.minAge && (
            <span className="text-xs text-gray-400">À partir de {game.minAge} ans</span>
          )}

          {game.averageRating && (
            <span className="text-yellow-500 text-xs">
              {"★".repeat(Math.round(game.averageRating))}{"☆".repeat(5 - Math.round(game.averageRating))}
              <span className="text-gray-400 ml-1">{game.averageRating}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

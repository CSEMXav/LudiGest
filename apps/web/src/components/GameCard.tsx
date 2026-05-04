"use client";

import Link from "next/link";
import type { GameDTO } from "@ludigest/types";
import { Pion, CAT_PION } from "./Pion";

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  escape:   { label: "Escape",   color: "#d24a1f" },
  famille:  { label: "Famille",  color: "#e8a82f" },
  ambiance: { label: "Ambiance", color: "#286b7a" },
  enfant:   { label: "Enfant",   color: "#f4c430" },
  "initié": { label: "Initié",   color: "#5b4d40" },
  expert:   { label: "Expert",   color: "#6a8f3c" },
};

function getCat(category: string) {
  return CAT_CONFIG[category] ?? CAT_CONFIG["famille"];
}

function gameTint(game: GameDTO): string {
  // Cycle through tints based on first char of id
  const code = game.id.charCodeAt(0) + game.id.charCodeAt(game.id.length - 1);
  return TINTS[code % TINTS.length];
}

function formatDueDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function StatusBadge({ status }: { status: GameDTO["status"] }) {
  if (status === "AVAILABLE") return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#e8f4ec", color: "#3a6a3e" }}>
      Disponible
    </span>
  );
  if (status === "BORROWED") return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(30,22,16,.85)", color: "#fff" }}>
      Emprunté
    </span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--p-rule)", color: "var(--p-ink3)" }}>
      Suspendu
    </span>
  );
}

/* ── List row (inchangé stylistiquement, juste nettoyé) ── */
export function GameListRow({ game }: { game: GameDTO }) {
  const cat = getCat(game.category);
  return (
    <Link href={`/games/${game.id}`} className="block">
      <div
        className="flex items-center gap-4 p-3 rounded-xl transition-all hover:-translate-y-px"
        style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}
      >
        <div
          className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: game.coverUrl ? undefined : cat.color }}
        >
          {game.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Pion tint={cat.color} kind={CAT_PION[game.category] ?? "meeple"} w={32} h={32} />
          )}
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 text-white" style={{ background: cat.color }}>
          {cat.label}
        </span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate font-display" style={{ color: "var(--p-ink)" }}>{game.name}</p>
          <p className="text-xs truncate" style={{ color: "var(--p-ink3)" }}>{game.type}</p>
        </div>

        <div className="hidden sm:flex gap-4 text-xs flex-shrink-0" style={{ color: "var(--p-ink2)" }}>
          {game.minPlayers && game.maxPlayers && (
            <span>👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}</span>
          )}
          {game.duration && <span>⏱ {game.duration} min</span>}
          {game.minAge && <span>🎂 {game.minAge}+</span>}
        </div>

        {game.averageRating && (
          <span className="hidden md:block text-xs flex-shrink-0" style={{ color: "var(--p-ocre)" }}>
            {"★".repeat(Math.round(game.averageRating))}{"☆".repeat(5 - Math.round(game.averageRating))}
          </span>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(game.reportCount ?? 0) > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }} title="Un signalement existe pour ce jeu">🚨</span>
          )}
          <StatusBadge status={game.status} />
        </div>
      </div>
    </Link>
  );
}

/* ── Plateau card (grille) ── */
export function GameCard({ game, dense = false }: { game: GameDTO; dense?: boolean }) {
  const cat = getCat(game.category);
  const tint = game.coverUrl ? cat.color : gameTint(game);
  const pionKind = CAT_PION[game.category] ?? "meeple";
  const pionSize = dense ? 60 : 76;
  const visualH = dense ? 120 : 144;

  const dueDate = (game as GameDTO & { activeLoan?: { dueAt: string } }).activeLoan?.dueAt;

  return (
    <Link href={`/games/${game.id}`} className="block group">
      <div
        className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 group-hover:-translate-y-0.5"
        style={{
          background: "#fff",
          border: "1.5px solid var(--p-rule)",
          borderTop: `4px solid ${cat.color}`,
          boxShadow: "none",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(30,22,16,.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        {/* Visuel */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ height: visualH, background: game.coverUrl ? undefined : tint }}
        >
          {game.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Pion tint={tint} kind={pionKind} w={pionSize} h={pionSize} />
          )}

          {/* Tampon EMPRUNTÉ — hachuré diagonal */}
          {game.status === "BORROWED" && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: "repeating-linear-gradient(135deg, rgba(30,22,16,.55) 0 14px, rgba(30,22,16,.35) 14px 28px)",
              }}
            >
              <div
                style={{
                  transform: "rotate(-12deg)",
                  background: "#1e1610",
                  color: "#fff",
                  padding: "4px 16px",
                  borderRadius: 4,
                  fontFamily: "var(--font-display, system-ui)",
                  fontSize: dense ? 13 : 15,
                  fontWeight: 800,
                  letterSpacing: 1,
                  boxShadow: "0 4px 12px rgba(0,0,0,.3)",
                }}
              >
                EMPRUNTÉ
              </div>
            </div>
          )}

          {/* Report badge */}
          {(game.reportCount ?? 0) > 0 && (
            <span
              className="absolute bottom-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}
            >🚨</span>
          )}
        </div>

        {/* Bandeau catégorie pleine largeur */}
        <div
          className="flex items-center justify-between"
          style={{
            background: cat.color,
            color: "#fff",
            padding: dense ? "5px 12px" : "6px 14px",
            fontSize: dense ? 10 : 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span>{cat.label}</span>
          <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>
            {game.status === "BORROWED"
              ? dueDate ? `Retour ${formatDueDate(dueDate)}` : "Emprunté"
              : "● Disponible"}
          </span>
        </div>

        {/* Corps texte */}
        <div style={{ padding: dense ? "10px 12px 12px" : "12px 14px 14px" }}>
          <div
            className="font-bold leading-tight mb-0.5"
            style={{
              fontFamily: "var(--font-display, system-ui)",
              fontSize: dense ? 14 : 16,
              lineHeight: 1.15,
              color: "var(--p-ink)",
            }}
          >
            {game.name}
          </div>
          <div className="text-[10px] mb-1.5" style={{ color: "var(--p-ink3)" }}>{game.type}</div>
          <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--p-ink2)" }}>
            <span>
              {game.minPlayers && game.maxPlayers && (
                <>👥 {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}</>
              )}
              {game.duration && <> · ⏱ {game.duration}min</>}
            </span>
            {game.averageRating && (
              <span style={{ color: "var(--p-ocre)" }}>
                {"★".repeat(Math.round(game.averageRating))}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

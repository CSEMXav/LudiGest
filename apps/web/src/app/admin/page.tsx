import { prisma } from "@/lib/prisma";
import { LOCATIONS } from "@ludigest/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalGames, availableGames, activeLoans, overdueLoans] = await Promise.all([
    prisma.game.count({ where: { status: { not: "SUSPENDED" } } }),
    prisma.game.count({ where: { status: "AVAILABLE" } }),
    prisma.loan.count({ where: { returnedAt: null } }),
    prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
  ]);

  const locationStats = await Promise.all(
    LOCATIONS.map(async (loc) => {
      const [total, available, loans, overdue] = await Promise.all([
        prisma.game.count({ where: { location: loc, status: { not: "SUSPENDED" } } }),
        prisma.game.count({ where: { location: loc, status: "AVAILABLE" } }),
        prisma.loan.count({ where: { returnedAt: null, game: { location: loc } } }),
        prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now }, game: { location: loc } } }),
      ]);
      return { loc, total, available, loans, overdue };
    })
  );

  const [totalLoansAllTime, loansLast30d, categoryGroups, topGameIds] = await Promise.all([
    prisma.loan.count(),
    prisma.loan.count({ where: { borrowedAt: { gte: thirtyDaysAgo } } }),
    prisma.game.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { status: { not: "SUSPENDED" } },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.loan.groupBy({
      by: ["gameId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const topGames = await Promise.all(
    topGameIds.map(async ({ gameId, _count }) => {
      const game = await prisma.game.findUnique({ where: { id: gameId }, select: { name: true } });
      return { name: game?.name ?? "—", count: _count.id };
    })
  );

  const completedLoans = await prisma.loan.findMany({
    where: { returnedAt: { not: null } },
    select: { borrowedAt: true, returnedAt: true },
  });
  const avgDays = completedLoans.length > 0
    ? Math.round(
        completedLoans.reduce((sum, l) => {
          const ms = new Date(l.returnedAt!).getTime() - new Date(l.borrowedAt).getTime();
          return sum + ms / (1000 * 60 * 60 * 24);
        }, 0) / completedLoans.length
      )
    : null;

  const lateCount = await prisma.loan.count({
    where: { returnedAt: { not: null }, dueAt: { lt: now } },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight leading-none" style={{ color: "var(--p-ink)" }}>
            Tableau de bord
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--p-ink2)" }}>
            Vue globale · {LOCATIONS.length} ludothèques
          </p>
        </div>
        <a
          href="/admin/sessions"
          className="px-4 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: "var(--p-ink)" }}
        >
          + Nouvelle soirée
        </a>
      </div>

      {/* Global stats */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-ink3)" }}>Global</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#e8f3dc", border: "1px solid var(--p-rule)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "var(--p-vert)", color: "#fff" }}>🎲</div>
          <div>
            <div className="font-display text-3xl font-bold leading-none" style={{ color: "#1e1610" }}>{availableGames}<span className="text-lg font-semibold" style={{ color: "#7a9656" }}> / {totalGames}</span></div>
            <div className="text-xs mt-1" style={{ color: "#3d5a1a" }}>Jeux disponibles</div>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#fcebd2", border: "1px solid var(--p-rule)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "var(--p-ocre)", color: "#fff" }}>📚</div>
          <div>
            <div className="font-display text-3xl font-bold leading-none" style={{ color: "var(--p-ink)" }}>{activeLoans}</div>
            <div className="text-xs mt-1" style={{ color: "#7d4a0d" }}>Emprunts en cours</div>
          </div>
        </div>
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: overdueLoans > 0 ? "var(--p-primary-soft)" : "#f5f5f0", border: "1px solid var(--p-rule)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: overdueLoans > 0 ? "var(--p-primary)" : "var(--p-ink3)", color: "#fff" }}>⚠️</div>
          <div>
            <div className="font-display text-3xl font-bold leading-none" style={{ color: "var(--p-ink)" }}>{overdueLoans}</div>
            <div className="text-xs mt-1" style={{ color: overdueLoans > 0 ? "#7c2410" : "var(--p-ink3)" }}>Emprunts en retard</div>
          </div>
        </div>
      </div>

      {/* Par ludothèque */}
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-ink3)" }}>Par ludothèque</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {locationStats.map(({ loc, total, available, loans, overdue }) => (
          <div key={loc} className="rounded-2xl p-5" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
            <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "var(--p-ink)" }}>
              <span style={{ color: "var(--p-primary)" }}>📍</span> {loc}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: "#e8f3dc", color: "#3d5a1a" }}>
                <div className="font-display text-xl font-bold leading-none">
                  {available}<span className="text-sm font-semibold" style={{ color: "#7a9656" }}> / {total}</span>
                </div>
                <div className="text-xs mt-1 opacity-80">Jeux disponibles</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: "#fcebd2", color: "#7d4a0d" }}>
                <div className="font-display text-xl font-bold leading-none">{loans}</div>
                <div className="text-xs mt-1 opacity-80">Emprunts</div>
              </div>
              {overdue > 0 && (
                <div className="col-span-2 rounded-xl p-3" style={{ background: "var(--p-primary-soft)", color: "#7c2410" }}>
                  <div className="font-display text-xl font-bold leading-none">{overdue}</div>
                  <div className="text-xs mt-1 opacity-80">En retard</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Données & statistiques — collapsible */}
      <details className="group rounded-2xl" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
        <summary
          className="flex items-center justify-between px-6 py-5 cursor-pointer list-none select-none rounded-2xl"
          style={{ color: "var(--p-ink)" }}
        >
          <h2 className="font-display text-xl font-bold" style={{ color: "var(--p-ink)" }}>Données &amp; statistiques</h2>
          <span className="text-sm transition-transform group-open:rotate-180" style={{ color: "var(--p-ink3)" }}>▼</span>
        </summary>

        <div className="px-6 pb-6 pt-2" style={{ borderTop: "1px solid var(--p-rule)" }}>
          {/* Loan summary */}
          <p className="text-xs font-bold uppercase tracking-widest mb-3 mt-4" style={{ color: "var(--p-ink3)" }}>Emprunts</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl p-3" style={{ background: "var(--p-bg)" }}>
              <div className="font-display text-xl font-bold" style={{ color: "var(--p-ink)" }}>{totalLoansAllTime}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>Total all time</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "#dee9f3" }}>
              <div className="font-display text-xl font-bold" style={{ color: "var(--p-bleu)" }}>{loansLast30d}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--p-bleu)" }}>Ces 30 derniers jours</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "var(--p-bg)" }}>
              <div className="font-display text-xl font-bold" style={{ color: "var(--p-ink)" }}>{avgDays !== null ? `${avgDays}j` : "—"}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>Durée moyenne</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: lateCount > 0 ? "var(--p-primary-soft)" : "var(--p-bg)" }}>
              <div className="font-display text-xl font-bold" style={{ color: lateCount > 0 ? "var(--p-primary)" : "var(--p-ink)" }}>{lateCount}</div>
              <div className="text-xs mt-0.5" style={{ color: lateCount > 0 ? "#7c2410" : "var(--p-ink3)" }}>Rendus en retard</div>
            </div>
          </div>

          {/* Top 5 */}
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-ink3)" }}>Top 5 jeux empruntés</p>
          <div className="space-y-2 mb-6">
            {topGames.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-display text-sm font-bold w-6 flex-shrink-0" style={{ color: "var(--p-ink3)" }}>0{i + 1}.</span>
                <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: "var(--p-bg)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${topGames[0].count > 0 ? Math.round((g.count / topGames[0].count) * 100) : 0}%`,
                      background: "var(--p-primary)",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold w-44 truncate" style={{ color: "var(--p-ink2)" }}>{g.name}</span>
                <span className="text-xs font-bold w-10 text-right tabular-nums" style={{ color: "var(--p-ink)" }}>{g.count}×</span>
              </div>
            ))}
            {topGames.length === 0 && <p className="text-sm" style={{ color: "var(--p-ink3)" }}>Aucun emprunt enregistré.</p>}
          </div>

          {/* Catégories */}
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--p-ink3)" }}>Répartition par catégorie</p>
          <div className="flex flex-wrap gap-2">
            {categoryGroups.map(({ category, _count }) => (
              <div key={category} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--p-bg)" }}>
                <span className="text-sm font-semibold capitalize" style={{ color: "var(--p-ink2)" }}>{category}</span>
                <span className="text-xs font-bold rounded-full px-2 py-0.5" style={{ background: "var(--p-ink)", color: "#fff" }}>{_count.id}</span>
              </div>
            ))}
            {categoryGroups.length === 0 && <p className="text-sm" style={{ color: "var(--p-ink3)" }}>Aucun jeu enregistré.</p>}
          </div>
        </div>
      </details>
    </div>
  );
}

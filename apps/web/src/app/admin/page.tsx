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

  // Extended stats for the collapsible section
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

  // Average loan duration (completed loans only)
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* Global */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Global</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-6 bg-green-50 text-green-700">
          <div className="text-3xl font-bold">{availableGames} / {totalGames}</div>
          <div className="text-sm mt-1 opacity-80">Jeux disponibles</div>
        </div>
        <div className="rounded-xl p-6 bg-orange-50 text-orange-700">
          <div className="text-3xl font-bold">{activeLoans}</div>
          <div className="text-sm mt-1 opacity-80">Emprunts en cours</div>
        </div>
        <div className={`rounded-xl p-6 ${overdueLoans > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"}`}>
          <div className="text-3xl font-bold">{overdueLoans}</div>
          <div className="text-sm mt-1 opacity-80">Emprunts en retard</div>
        </div>
      </div>

      {/* Par lieu */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Par ludothèque</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {locationStats.map(({ loc, total, available, loans, overdue }) => (
          <div key={loc} className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-[#C8102E]">📍</span> {loc}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 bg-green-50 text-green-700">
                <div className="text-xl font-bold">{available} / {total}</div>
                <div className="text-xs opacity-80">Jeux disponibles</div>
              </div>
              <div className="rounded-lg p-3 bg-orange-50 text-orange-700">
                <div className="text-xl font-bold">{loans}</div>
                <div className="text-xs opacity-80">Emprunts en cours</div>
              </div>
              {overdue > 0 && (
                <div className="col-span-2 rounded-lg p-3 bg-red-50 text-red-700">
                  <div className="text-xl font-bold">{overdue}</div>
                  <div className="text-xs opacity-80">Emprunts en retard</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Données & statistiques — collapsible */}
      <details className="group bg-white rounded-xl border border-gray-100">
        <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50 rounded-xl transition-colors">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Données &amp; statistiques</h2>
          <span className="text-gray-400 text-sm transition-transform group-open:rotate-180">▼</span>
        </summary>

        <div className="px-5 pb-6 pt-2 border-t border-gray-100">
          {/* Loan summary */}
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-4">Emprunts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-lg p-3 bg-gray-50">
              <div className="text-xl font-bold text-gray-800">{totalLoansAllTime}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total all time</div>
            </div>
            <div className="rounded-lg p-3 bg-blue-50">
              <div className="text-xl font-bold text-blue-700">{loansLast30d}</div>
              <div className="text-xs text-blue-600 mt-0.5">Ces 30 derniers jours</div>
            </div>
            <div className="rounded-lg p-3 bg-gray-50">
              <div className="text-xl font-bold text-gray-800">{avgDays !== null ? `${avgDays}j` : "—"}</div>
              <div className="text-xs text-gray-500 mt-0.5">Durée moyenne</div>
            </div>
            <div className={`rounded-lg p-3 ${lateCount > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <div className={`text-xl font-bold ${lateCount > 0 ? "text-red-700" : "text-gray-800"}`}>{lateCount}</div>
              <div className={`text-xs mt-0.5 ${lateCount > 0 ? "text-red-500" : "text-gray-500"}`}>Rendus en retard</div>
            </div>
          </div>

          {/* Top jeux */}
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Top 5 jeux empruntés</h3>
          <div className="space-y-2 mb-6">
            {topGames.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#C8102E] h-2 rounded-full"
                    style={{ width: `${topGames[0].count > 0 ? Math.round((g.count / topGames[0].count) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-40 truncate">{g.name}</span>
                <span className="text-xs text-gray-500 w-8 text-right">{g.count}x</span>
              </div>
            ))}
            {topGames.length === 0 && <p className="text-sm text-gray-400">Aucun emprunt enregistré.</p>}
          </div>

          {/* Répartition par catégorie */}
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Répartition par catégorie</h3>
          <div className="flex flex-wrap gap-2">
            {categoryGroups.map(({ category, _count }) => (
              <div key={category} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{_count.id}</span>
              </div>
            ))}
            {categoryGroups.length === 0 && <p className="text-sm text-gray-400">Aucun jeu enregistré.</p>}
          </div>
        </div>
      </details>
    </div>
  );
}

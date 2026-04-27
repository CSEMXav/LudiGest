import { prisma } from "@/lib/prisma";
import { LOCATIONS } from "@ludigest/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
    </div>
  );
}

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalGames, availableGames, activeLoans, overdueLoans] = await Promise.all([
    prisma.game.count({ where: { status: { not: "SUSPENDED" } } }),
    prisma.game.count({ where: { status: "AVAILABLE" } }),
    prisma.loan.count({ where: { returnedAt: null } }),
    prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: new Date() } } }),
  ]);

  const stats = [
    { label: "Jeux disponibles", value: `${availableGames} / ${totalGames}`, color: "bg-green-50 text-green-700" },
    { label: "Emprunts en cours", value: activeLoans, color: "bg-orange-50 text-orange-700" },
    { label: "Emprunts en retard", value: overdueLoans, color: overdueLoans > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl p-6 ${s.color}`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm mt-1 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

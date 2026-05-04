import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const [totalGames, activeLoans, overdueLoans] = await Promise.all([
    prisma.game.count({ where: { status: { not: "SUSPENDED" } } }),
    prisma.loan.count({ where: { returnedAt: null } }),
    prisma.loan.count({ where: { returnedAt: null, dueAt: { lt: now } } }),
  ]);

  return NextResponse.json({ totalGames, activeLoans, overdueLoans });
}

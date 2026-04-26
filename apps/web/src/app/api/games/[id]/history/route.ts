import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const loans = await prisma.loan.findMany({
    where: { gameId: params.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { borrowedAt: "desc" },
  });

  return NextResponse.json(
    loans.map((l) => ({
      id: l.id,
      userName: l.user.name,
      userEmail: l.user.email,
      borrowedAt: l.borrowedAt.toISOString(),
      dueAt: l.dueAt.toISOString(),
      returnedAt: l.returnedAt?.toISOString() ?? null,
      extendedCount: l.extendedCount,
    }))
  );
}

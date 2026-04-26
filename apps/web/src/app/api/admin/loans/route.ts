import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const loans = await prisma.loan.findMany({
    where: activeOnly ? { returnedAt: null } : {},
    include: {
      user: { select: { name: true, email: true } },
      game: { select: { name: true, coverUrl: true } },
    },
    orderBy: { borrowedAt: "desc" },
  });

  return NextResponse.json(
    loans.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      userEmail: l.user.email,
      gameId: l.gameId,
      gameName: l.game.name,
      gameCoverUrl: l.game.coverUrl,
      borrowedAt: l.borrowedAt.toISOString(),
      dueAt: l.dueAt.toISOString(),
      returnedAt: l.returnedAt?.toISOString() ?? null,
      extendedCount: l.extendedCount,
    }))
  );
}

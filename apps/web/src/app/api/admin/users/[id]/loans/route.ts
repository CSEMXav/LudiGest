import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const loans = await prisma.loan.findMany({
    where: { userId: params.id },
    include: { game: { select: { name: true, coverUrl: true } } },
    orderBy: { borrowedAt: "desc" },
  });

  return NextResponse.json(
    loans.map((l) => ({
      id: l.id,
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

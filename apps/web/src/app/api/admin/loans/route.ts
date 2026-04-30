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
  const where = activeOnly ? { returnedAt: null } : {};

  // Try with reminders; fall back silently if LoanReminder table doesn't exist yet
  let loans;
  try {
    loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        game: { select: { name: true, coverUrl: true } },
        reminders: { select: { type: true, sentAt: true }, orderBy: { sentAt: "asc" } },
      },
      orderBy: { borrowedAt: "desc" },
    });
  } catch {
    const raw = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        game: { select: { name: true, coverUrl: true } },
      },
      orderBy: { borrowedAt: "desc" },
    });
    loans = raw.map((l) => ({ ...l, reminders: [] as { type: string; sentAt: Date }[] }));
  }

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
      wasLate: l.returnedAt
        ? new Date(l.returnedAt) > new Date(l.dueAt)
        : new Date() > new Date(l.dueAt),
      reminders: l.reminders.map((r) => ({
        type: r.type,
        sentAt: r.sentAt.toISOString(),
      })),
    }))
  );
}

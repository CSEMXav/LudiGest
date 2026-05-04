import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

async function getUserId(req: NextRequest): Promise<string | null> {
  const mobilePayload = await verifyMobileToken(req);
  if (mobilePayload) return mobilePayload.id;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  try {
    // All session notifications (both read and unread)
    const sessionNotifs = await prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // All loan reminders — fallback to empty if table doesn't exist yet
    let loanReminders: Array<{ id: string; type: string; sentAt: Date; loan: { id: string; dueAt: Date; returnedAt: Date | null; game: { name: string } } }> = [];
    try {
      loanReminders = await prisma.loanReminder.findMany({
        where: { loan: { userId } },
        include: {
          loan: {
            select: { id: true, dueAt: true, returnedAt: true, game: { select: { name: true } } },
          },
        },
        orderBy: { sentAt: "desc" },
      });
    } catch { /* LoanReminder table may not exist yet */ }

    const notifications = [
      ...sessionNotifs.map((n) => ({
        id: n.id,
        type: n.type as "SESSION_INVITE" | "SESSION_REMINDER" | "GAME_REPORT",
        title: n.title,
        message: n.message,
        sessionId: n.sessionId,
        loanId: null,
        createdAt: n.createdAt.toISOString(),
        read: n.readAt !== null,
      })),
      ...loanReminders.map((r) => ({
        id: r.id,
        type: "LOAN_REMINDER" as const,
        title: `Rappel : ${r.loan.game.name}`,
        message: r.loan.returnedAt
          ? `Rendu le ${r.loan.returnedAt.toLocaleDateString("fr-FR")}`
          : `À rendre avant le ${r.loan.dueAt.toLocaleDateString("fr-FR")}`,
        sessionId: null,
        loanId: r.loan.id,
        createdAt: r.sentAt.toISOString(),
        read: r.loan.returnedAt !== null,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("GET /api/user/notifications error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

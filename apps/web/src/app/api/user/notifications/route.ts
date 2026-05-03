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

  // Session notifications (unread)
  const sessionNotifs = await prisma.userNotification.findMany({
    where: { userId, readAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Loan reminders where loan is not yet returned
  const loanReminders = await prisma.loanReminder.findMany({
    where: {
      loan: { userId, returnedAt: null },
    },
    include: {
      loan: {
        select: { id: true, dueAt: true, game: { select: { name: true } } },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  const notifications = [
    ...sessionNotifs.map((n) => ({
      id: n.id,
      type: n.type as "SESSION_INVITE" | "SESSION_REMINDER",
      title: n.title,
      message: n.message,
      sessionId: n.sessionId,
      loanId: null,
      createdAt: n.createdAt.toISOString(),
    })),
    ...loanReminders.map((r) => ({
      id: r.id,
      type: "LOAN_REMINDER" as const,
      title: `Rappel : ${r.loan.game.name}`,
      message: `À rendre avant le ${r.loan.dueAt.toLocaleDateString("fr-FR")}`,
      sessionId: null,
      loanId: r.loan.id,
      createdAt: r.sentAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(notifications);
}

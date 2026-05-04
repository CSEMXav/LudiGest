import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

const TYPE_LABELS: Record<string, string> = {
  reminder: "Rappel avant échéance",
  overdue: "Retard après échéance",
  SESSION_INVITE: "Invitation session",
  SESSION_REMINDER: "Rappel session",
  GAME_REPORT: "Signalement jeu",
};

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const [loanReminders, sessionNotifs] = await Promise.all([
      prisma.loanReminder.findMany({
        orderBy: { sentAt: "desc" },
        take: 200,
        include: {
          loan: {
            select: {
              id: true,
              dueAt: true,
              returnedAt: true,
              game: { select: { name: true } },
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.userNotification.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: { select: { name: true, email: true } },
          session: { select: { name: true, isPrivate: true } },
        },
      }),
    ]);

    const logs = [
      ...loanReminders.map((r) => ({
        id: r.id,
        sentAt: r.sentAt.toISOString(),
        typeKey: r.type,
        typeLabel: TYPE_LABELS[r.type] ?? r.type,
        userEmail: r.loan.user.email,
        userName: r.loan.user.name,
        detail: r.loan.game.name,
        loanActive: r.loan.returnedAt === null,
      })),
      ...sessionNotifs.map((n) => ({
        id: n.id,
        sentAt: n.createdAt.toISOString(),
        typeKey: n.type,
        typeLabel: n.session?.isPrivate
          ? "Invitation session privée"
          : TYPE_LABELS[n.type] ?? n.type,
        userEmail: n.user.email,
        userName: n.user.name,
        detail: n.session?.name ?? n.title,
        loanActive: null,
      })),
    ].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return NextResponse.json(logs);
  } catch (err) {
    console.error("GET /api/admin/email-logs error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

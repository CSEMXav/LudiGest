import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parisLocalToUtc } from "@/lib/session-utils";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

const TYPE_LABELS: Record<string, string> = {
  reminder: "Rappel avant échéance",
  overdue: "Retard après échéance",
  overdue_manual: "Retard (rappel admin)",
  SESSION_INVITE: "Invitation session",
  SESSION_REMINDER: "Rappel session",
  SESSION_UPDATE: "Session mise à jour",
  GAME_REPORT: "Signalement jeu",
  NEW_GAMES: "Nouveaux jeux",
};

const DEFAULT_DAYS = 10;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/admin/email-logs?date=YYYY-MM-DD&email=texte
 *  - sans date ni email : les 10 derniers jours
 *  - email sans date : toutes les dates
 *  - date      : uniquement ce jour-là (heure de Paris)
 *  - email     : filtre "contient" sur l'adresse du destinataire
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date") ?? "";
  const emailParam = (searchParams.get("email") ?? "").trim();

  // Date précise → ce jour-là ; email seul → toutes les dates ; rien → 10 derniers jours
  let range: { gte?: Date; lt?: Date } | undefined;
  if (DATE_RE.test(dateParam)) {
    range = { gte: parisLocalToUtc(dateParam, "00:00"), lt: new Date(parisLocalToUtc(dateParam, "23:59").getTime() + 60_000) };
  } else if (emailParam) {
    range = undefined;
  } else {
    range = { gte: new Date(Date.now() - DEFAULT_DAYS * 24 * 60 * 60 * 1000) };
  }
  const emailFilter = emailParam ? { email: { contains: emailParam, mode: "insensitive" as const } } : null;

  try {
    let loanReminders: any[] = [];
    try {
      loanReminders = await prisma.loanReminder.findMany({
        where: { sentAt: range, ...(emailFilter ? { loan: { user: emailFilter } } : {}) },
        orderBy: { sentAt: "desc" },
        take: 1000,
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
      });
    } catch { /* LoanReminder table may not exist yet */ }

    const sessionNotifs = await prisma.userNotification.findMany({
      where: { createdAt: range, ...(emailFilter ? { user: emailFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        user: { select: { name: true, email: true } },
        session: { select: { name: true, isPrivate: true } },
      },
    });

    // GAME_REPORT : une ligne par signalement (pas une par admin), sauf si on filtre par email
    const seenReportTitles = new Set<string>();
    const deduplicatedNotifs = sessionNotifs.filter((n) => {
      if (n.type === "GAME_REPORT" && !emailFilter) {
        if (seenReportTitles.has(n.title)) return false;
        seenReportTitles.add(n.title);
      }
      return true;
    });

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
      ...deduplicatedNotifs.map((n) => {
        const groupedReport = n.type === "GAME_REPORT" && !emailFilter;
        return {
          id: n.id,
          sentAt: n.createdAt.toISOString(),
          typeKey: n.type,
          typeLabel: n.type === "GAME_REPORT"
            ? "Signalement jeu"
            : n.session?.isPrivate
            ? "Invitation session privée"
            : TYPE_LABELS[n.type] ?? n.type,
          userEmail: groupedReport ? "admins" : n.user.email,
          userName: groupedReport ? "" : n.user.name,
          detail: n.type === "GAME_REPORT"
            ? n.title.replace("🚨 Signalement : ", "")
            : n.session?.name ?? n.title,
          loanActive: null,
        };
      }),
    ].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return NextResponse.json(logs);
  } catch (err) {
    console.error("GET /api/admin/email-logs error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

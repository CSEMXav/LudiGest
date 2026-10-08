import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { sendAdminAssignedLoanEmail } from "@/lib/email";
import { parisLocalToUtc } from "@/lib/session-utils";

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
        game: { select: { name: true, coverUrl: true, location: true } },
        reminders: { select: { type: true, sentAt: true }, orderBy: { sentAt: "asc" } },
      },
      orderBy: { borrowedAt: "desc" },
    });
  } catch {
    const raw = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        game: { select: { name: true, coverUrl: true, location: true } },
      },
      orderBy: { borrowedAt: "desc" },
    });
    loans = raw.map((l) => ({ ...l, reminders: [] as { type: string; sentAt: Date }[] }));
  }

  // Fallback: if a loan has reminderSentAt but no LoanReminder records, synthesize one
  loans = loans.map((l) => {
    if (l.reminders.length === 0 && (l as any).reminderSentAt) {
      return { ...l, reminders: [{ type: "reminder", sentAt: (l as any).reminderSentAt as Date }] };
    }
    return l;
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
      gameLocation: l.game.location,
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

const LOAN_DAYS = 28;

/**
 * POST /api/admin/loans — un admin enregistre un emprunt au nom d'un membre.
 * Body : { gameId, userId, borrowedAt?: "YYYY-MM-DD" } (date du jour ou antérieure, heure de Paris)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user ?? (await verifyMobileToken(req));
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { gameId, userId, borrowedAt: borrowedAtInput } = body as { gameId?: string; userId?: string; borrowedAt?: string };
  if (!gameId || !userId) {
    return NextResponse.json({ error: "Jeu et utilisateur requis." }, { status: 400 });
  }

  const now = new Date();
  const todayParis = now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  let borrowedAt = now;
  if (borrowedAtInput) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(borrowedAtInput) || isNaN(new Date(borrowedAtInput).getTime())) {
      return NextResponse.json({ error: "Date d'emprunt invalide." }, { status: 400 });
    }
    if (borrowedAtInput > todayParis) {
      return NextResponse.json({ error: "La date d'emprunt ne peut pas être dans le futur." }, { status: 400 });
    }
    if (borrowedAtInput < todayParis) borrowedAt = parisLocalToUtc(borrowedAtInput, "12:00");
  }
  const dueAt = new Date(borrowedAt.getTime() + LOAN_DAYS * 24 * 60 * 60 * 1000);

  const [game, user] = await Promise.all([
    prisma.game.findUnique({ where: { id: gameId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, suspended: true } }),
  ]);
  if (!game) return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (user.suspended) return NextResponse.json({ error: "Ce compte utilisateur est suspendu." }, { status: 409 });

  // Passage AVAILABLE → BORROWED conditionnel : évite un double emprunt simultané
  let loan;
  try {
    loan = await prisma.$transaction(async (tx) => {
      const claimed = await tx.game.updateMany({ where: { id: game.id, status: "AVAILABLE" }, data: { status: "BORROWED" } });
      if (claimed.count === 0) throw new Error("NOT_AVAILABLE");
      return tx.loan.create({ data: { userId: user.id, gameId: game.id, borrowedAt, dueAt } });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_AVAILABLE") {
      return NextResponse.json(
        { error: game.status === "BORROWED" ? "Ce jeu est déjà emprunté." : "Ce jeu n'est pas disponible." },
        { status: 409 }
      );
    }
    throw err;
  }

  let emailSent = true;
  try {
    await sendAdminAssignedLoanEmail(user.email, user.name, game.name, borrowedAt, dueAt, game.id);
    await prisma.loanReminder.create({ data: { loanId: loan.id, type: "admin_assigned" } }).catch(() => {});
  } catch {
    emailSent = false;
  }

  return NextResponse.json(
    {
      id: loan.id,
      userId: user.id,
      userName: user.name,
      gameId: game.id,
      gameName: game.name,
      borrowedAt: loan.borrowedAt.toISOString(),
      dueAt: loan.dueAt.toISOString(),
      emailSent,
    },
    { status: 201 }
  );
}

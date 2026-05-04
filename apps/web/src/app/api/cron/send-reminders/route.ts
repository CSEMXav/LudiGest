import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail, sendOverdueEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load email config or fall back to defaults
  const config = await prisma.emailConfig
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);

  const reminderDaysBefore = config?.reminderDaysBefore ?? 2;
  const overdueFrequencyDays = config?.overdueFrequencyDays ?? 3;
  const sendHour = (config as any)?.sendHour ?? 8;

  // Check if current UTC hour matches the configured send hour
  const currentHour = new Date().getUTCHours();
  if (currentHour !== sendHour) {
    return NextResponse.json({ skipped: true });
  }

  const now = new Date();
  let remindersCount = 0;
  let overdueCount = 0;
  let sent = 0;

  // ── 1. Upcoming reminders ──────────────────────────────────────────────────
  const reminderWindowStart = new Date(now.getTime() + (reminderDaysBefore - 0.5) * 24 * 60 * 60 * 1000);
  const reminderWindowEnd = new Date(now.getTime() + (reminderDaysBefore + 0.5) * 24 * 60 * 60 * 1000);

  const upcomingLoans = await prisma.loan.findMany({
    where: {
      returnedAt: null,
      dueAt: {
        gte: reminderWindowStart,
        lte: reminderWindowEnd,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      game: { select: { name: true } },
    },
  });

  for (const loan of upcomingLoans) {
    try {
      const existing = await prisma.loanReminder.findFirst({
        where: { loanId: loan.id, type: "reminder" },
      });
      if (existing) continue;
    } catch {
      // LoanReminder table may not exist yet — treat as no existing reminder
    }

    const dateStr = loan.dueAt.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const gameName = loan.game.name;

    await sendReminderEmail(loan.user.email!, loan.user.name!, gameName, loan.dueAt);
    sent++;
    remindersCount++;

    try {
      await prisma.loanReminder.create({ data: { loanId: loan.id, type: "reminder" } });
      await prisma.userNotification.create({
        data: {
          userId: loan.user.id,
          type: "LOAN_REMINDER",
          title: `⏰ Rappel : rendez "${gameName}" avant le ${dateStr}`,
          message: `Votre emprunt arrive à échéance le ${dateStr}`,
        },
      });
    } catch { /* LoanReminder / UserNotification table may not exist yet */ }
  }

  // ── 2. Overdue reminders ───────────────────────────────────────────────────
  const overdueLoans = await prisma.loan.findMany({
    where: {
      returnedAt: null,
      dueAt: { lt: now },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      game: { select: { name: true } },
    },
  });

  for (const loan of overdueLoans) {
    try {
      const lastOverdue = await prisma.loanReminder.findFirst({
        where: { loanId: loan.id, type: "overdue" },
        orderBy: { sentAt: "desc" },
      });

      if (lastOverdue) {
        const daysSinceLast =
          (now.getTime() - lastOverdue.sentAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < overdueFrequencyDays) continue;
      }
    } catch {
      // LoanReminder table may not exist yet — send regardless
    }

    const dateStr = loan.dueAt.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const gameName = loan.game.name;

    await sendOverdueEmail(loan.user.email!, loan.user.name!, gameName, loan.dueAt);
    sent++;
    overdueCount++;

    try {
      await prisma.loanReminder.create({ data: { loanId: loan.id, type: "overdue" } });
      await prisma.userNotification.create({
        data: {
          userId: loan.user.id,
          type: "LOAN_REMINDER",
          title: `⏰ Rappel : rendez "${gameName}" avant le ${dateStr}`,
          message: `Votre emprunt arrive à échéance le ${dateStr}`,
        },
      });
    } catch { /* LoanReminder / UserNotification table may not exist yet */ }
  }

  return NextResponse.json({ sent, remindersCount, overdueCount });
}

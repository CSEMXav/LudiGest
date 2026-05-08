import { prisma } from "@/lib/prisma";
import { sendReminderEmail, sendOverdueEmail } from "@/lib/email";

export interface ReminderResult {
  sent: number;
  remindersCount: number;
  overdueCount: number;
  skipped: number;
  details: string[];
}

export async function runSendReminders(): Promise<ReminderResult> {
  const config = await prisma.emailConfig
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);

  const reminderDaysBefore = config?.reminderDaysBefore ?? 2;
  const overdueFrequencyDays = config?.overdueFrequencyDays ?? 3;

  const now = new Date();
  let remindersCount = 0;
  let overdueCount = 0;
  let skipped = 0;
  let sent = 0;
  const details: string[] = [];

  // ── 1. Upcoming reminders ──────────────────────────────────────────────────
  const reminderWindowStart = new Date(now.getTime() + (reminderDaysBefore - 0.5) * 24 * 60 * 60 * 1000);
  const reminderWindowEnd   = new Date(now.getTime() + (reminderDaysBefore + 0.5) * 24 * 60 * 60 * 1000);

  const upcomingLoans = await prisma.loan.findMany({
    where: { returnedAt: null, dueAt: { gte: reminderWindowStart, lte: reminderWindowEnd } },
    include: {
      user: { select: { id: true, name: true, email: true, pushToken: true } },
      game: { select: { name: true } },
    },
  });

  for (const loan of upcomingLoans) {
    try {
      const existing = await prisma.loanReminder.findFirst({ where: { loanId: loan.id, type: "reminder" } });
      if (existing) { skipped++; details.push(`SKIP rappel ${loan.user.name} / ${loan.game.name} (déjà envoyé)`); continue; }
    } catch { /* table absente — envoyer quand même */ }

    const dateStr = loan.dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    await sendReminderEmail(loan.user.email!, loan.user.name!, loan.game.name, loan.dueAt);
    sent++; remindersCount++;
    details.push(`RAPPEL envoyé → ${loan.user.email} (${loan.game.name}, échéance ${dateStr})`);

    try {
      await prisma.loanReminder.create({ data: { loanId: loan.id, type: "reminder" } });
      await prisma.userNotification.create({
        data: {
          userId: loan.user.id,
          type: "LOAN_REMINDER",
          title: `⏰ Rappel : rendez "${loan.game.name}" avant le ${dateStr}`,
          message: `Votre emprunt arrive à échéance le ${dateStr}`,
        },
      });
    } catch { /* ignore */ }

    if (loan.user.pushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: loan.user.pushToken,
            title: "⏰ Rappel d'emprunt",
            body: `Pensez à rendre "${loan.game.name}" avant le ${dateStr}`,
            sound: "default",
            channelId: "default",
            data: { type: "loan_reminder", loanId: loan.id },
          }),
        });
      } catch { /* push failure non-bloquant */ }
    }
  }

  // ── 2. Overdue reminders ───────────────────────────────────────────────────
  const overdueLoans = await prisma.loan.findMany({
    where: { returnedAt: null, dueAt: { lt: now } },
    include: {
      user: { select: { id: true, name: true, email: true, pushToken: true } },
      game: { select: { name: true } },
    },
  });

  for (const loan of overdueLoans) {
    let shouldSkip = false;
    let skipReason = "";

    try {
      const lastOverdue = await prisma.loanReminder.findFirst({
        where: { loanId: loan.id, type: "overdue" },
        orderBy: { sentAt: "desc" },
      });
      if (lastOverdue) {
        const daysSinceLast = (now.getTime() - lastOverdue.sentAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < overdueFrequencyDays) {
          shouldSkip = true;
          skipReason = `dernier envoi il y a ${daysSinceLast.toFixed(1)}j < ${overdueFrequencyDays}j`;
        }
      }
    } catch { /* table absente — envoyer */ }

    if (shouldSkip) {
      skipped++;
      details.push(`SKIP retard ${loan.user.name} / ${loan.game.name} (${skipReason})`);
      continue;
    }

    const dateStr = loan.dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    await sendOverdueEmail(loan.user.email!, loan.user.name!, loan.game.name, loan.dueAt);
    sent++; overdueCount++;
    details.push(`RETARD envoyé → ${loan.user.email} (${loan.game.name}, dû le ${dateStr})`);

    try {
      await prisma.loanReminder.create({ data: { loanId: loan.id, type: "overdue" } });
      await prisma.userNotification.create({
        data: {
          userId: loan.user.id,
          type: "LOAN_REMINDER",
          title: `⚠️ Retard : rendez "${loan.game.name}"`,
          message: `Votre emprunt aurait dû être rendu le ${dateStr}`,
        },
      });
    } catch { /* ignore */ }

    if (loan.user.pushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: loan.user.pushToken,
            title: "⚠️ Emprunt en retard",
            body: `"${loan.game.name}" aurait dû être rendu le ${dateStr}`,
            sound: "default",
            channelId: "default",
            data: { type: "loan_reminder", loanId: loan.id },
          }),
        });
      } catch { /* push failure non-bloquant */ }
    }
  }

  console.log(`[reminders] sent=${sent} reminders=${remindersCount} overdue=${overdueCount} skipped=${skipped}`);
  details.forEach((d) => console.log(`[reminders] ${d}`));

  return { sent, remindersCount, overdueCount, skipped, details };
}

import { prisma } from "@/lib/prisma";
import { sendReminderEmail, sendOverdueEmail } from "@/lib/email";

interface PushJob {
  userId: string;
  pushToken: string;
  title: string;
  body: string;
  data: Record<string, string>;
  label: string; // pour les logs
}

/**
 * Envoie toutes les push notifications en un seul appel batch Expo.
 * Expo recommande de grouper les messages plutôt que d'envoyer en rafale
 * pour le même token (risque de throttling/drop).
 */
async function flushPushBatch(jobs: PushJob[], details: string[]): Promise<void> {
  if (jobs.length === 0) return;

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        jobs.map((j) => ({
          to: j.pushToken,
          title: j.title,
          body: j.body,
          sound: "default",
          channelId: "default",
          data: j.data,
        }))
      ),
    });

    const json = await res.json();
    // L'API batch retourne { data: [ ticket, ticket, ... ] }
    const tickets: Array<{ status: string; id?: string; message?: string; details?: { error?: string } }> =
      Array.isArray(json?.data) ? json.data : [json?.data];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const ticket = tickets[i];
      if (!ticket) {
        details.push(`  └─ ${job.label} : PUSH_NO_TICKET`);
        continue;
      }
      if (ticket.status === "error") {
        const errCode = ticket.details?.error ?? "unknown";
        console.error(`[push] Erreur Expo pour userId=${job.userId} (${job.label}): ${ticket.message} (${errCode})`);
        if (errCode === "DeviceNotRegistered") {
          await prisma.user.update({ where: { id: job.userId }, data: { pushToken: null } }).catch(() => null);
          details.push(`  └─ ${job.label} : PUSH_TOKEN_INVALIDE (supprimé)`);
        } else {
          details.push(`  └─ ${job.label} : PUSH_ERREUR ${errCode}`);
        }
      } else {
        details.push(`  └─ ${job.label} : PUSH OK`);
      }
    }
  } catch (e) {
    console.error("[push] batch fetch error:", e);
    for (const job of jobs) {
      details.push(`  └─ ${job.label} : PUSH_EXCEPTION`);
    }
  }
}

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
  const pushJobs: PushJob[] = []; // accumulés puis envoyés en un seul batch à la fin

  // ── 1. Upcoming reminders ──────────────────────────────────────────────────
  // Comparaison par jour calendaire UTC pour éviter les décalages horaires
  const targetDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + reminderDaysBefore,
  ));
  const reminderWindowStart = targetDay; // début du jour cible (00:00 UTC)
  const reminderWindowEnd   = new Date(targetDay.getTime() + 24 * 60 * 60 * 1000 - 1); // fin du jour cible (23:59:59 UTC)

  const upcomingLoans = await prisma.loan.findMany({
    where: { returnedAt: null, dueAt: { gte: reminderWindowStart, lte: reminderWindowEnd } },
    include: {
      user: { select: { id: true, name: true, email: true, pushToken: true } },
      game: { select: { name: true } },
    },
  });

  for (const loan of upcomingLoans) {
    try {
      // Skip uniquement si un rappel automatique (type "reminder") a déjà été envoyé
      // dans la même fenêtre (= les 48h précédant l'échéance), pour ne pas envoyer deux fois le même jour
      const existing = await prisma.loanReminder.findFirst({
        where: { loanId: loan.id, type: "reminder" },
        orderBy: { sentAt: "desc" },
      });
      if (existing) {
        // Vérifie que le rappel a bien été envoyé dans la fenêtre actuelle (pas d'un cycle précédent)
        const hoursSinceReminder = (now.getTime() - existing.sentAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceReminder < 22) {
          skipped++;
          details.push(`SKIP rappel ${loan.user.name} / ${loan.game.name} (déjà envoyé il y a ${hoursSinceReminder.toFixed(1)}h)`);
          continue;
        }
      }
    } catch { /* table absente — envoyer quand même */ }

    const dateStr = loan.dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    await sendReminderEmail(loan.user.email!, loan.user.name!, loan.game.name, loan.dueAt, loan.gameId);
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
      pushJobs.push({
        userId: loan.user.id,
        pushToken: loan.user.pushToken,
        title: "⏰ Rappel d'emprunt",
        body: `Pensez à rendre "${loan.game.name}" avant le ${dateStr}`,
        data: { type: "loan_reminder", loanId: loan.id },
        label: `${loan.user.name} / ${loan.game.name}`,
      });
    } else {
      details.push(`  └─ ${loan.user.name} / ${loan.game.name} : PUSH_SKIP (pas de token)`);
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
        where: { loanId: loan.id, type: { in: ["overdue", "overdue_manual"] } },
        orderBy: { sentAt: "desc" },
      });
      if (lastOverdue) {
        // Utilise les heures avec une tolérance de 2h pour éviter les décalages du cron
        const hoursSinceLast = (now.getTime() - lastOverdue.sentAt.getTime()) / (1000 * 60 * 60);
        const thresholdHours = overdueFrequencyDays * 24 - 2;
        if (hoursSinceLast < thresholdHours) {
          shouldSkip = true;
          skipReason = `dernier envoi il y a ${(hoursSinceLast).toFixed(1)}h < ${thresholdHours}h (seuil ${overdueFrequencyDays}j)`;
        }
      }
    } catch { /* table absente — envoyer */ }

    if (shouldSkip) {
      skipped++;
      details.push(`SKIP retard ${loan.user.name} / ${loan.game.name} (${skipReason})`);
      continue;
    }

    const dateStr = loan.dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    await sendOverdueEmail(loan.user.email!, loan.user.name!, loan.game.name, loan.dueAt, loan.gameId);
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
      pushJobs.push({
        userId: loan.user.id,
        pushToken: loan.user.pushToken,
        title: "⚠️ Emprunt en retard",
        body: `"${loan.game.name}" aurait dû être rendu le ${dateStr}`,
        data: { type: "loan_reminder", loanId: loan.id },
        label: `${loan.user.name} / ${loan.game.name}`,
      });
    } else {
      details.push(`  └─ ${loan.user.name} / ${loan.game.name} : PUSH_SKIP (pas de token)`);
    }
  }

  // ── 3. Envoi batch de toutes les push notifications ────────────────────────
  if (pushJobs.length > 0) {
    details.push(`Push notifications (${pushJobs.length} en batch) :`);
    await flushPushBatch(pushJobs, details);
  }

  console.log(`[reminders] config: reminderDaysBefore=${reminderDaysBefore} overdueFrequencyDays=${overdueFrequencyDays}`);
  console.log(`[reminders] upcoming window: ${reminderWindowStart.toISOString()} → ${reminderWindowEnd.toISOString()} (${upcomingLoans.length} prêt(s) trouvé(s))`);
  console.log(`[reminders] overdue: ${overdueLoans.length} prêt(s) en retard`);
  console.log(`[reminders] sent=${sent} reminders=${remindersCount} overdue=${overdueCount} skipped=${skipped}`);
  details.forEach((d) => console.log(`[reminders] ${d}`));

  return { sent, remindersCount, overdueCount, skipped, details };
}

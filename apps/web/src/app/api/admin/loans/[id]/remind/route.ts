import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail, sendOverdueEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const loan = await prisma.loan.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, pushToken: true } },
      game: { select: { name: true } },
    },
  });

  if (!loan || loan.returnedAt) {
    return NextResponse.json({ error: "Emprunt introuvable ou déjà rendu" }, { status: 404 });
  }

  const isOverdue = new Date(loan.dueAt) < new Date();
  const type = isOverdue ? "overdue" : "reminder";

  if (isOverdue) {
    await sendOverdueEmail(loan.user.email, loan.user.name, loan.game.name, loan.dueAt);
  } else {
    await sendReminderEmail(loan.user.email, loan.user.name, loan.game.name, loan.dueAt);
  }

  // Always update reminderSentAt on the loan (field exists in base schema, used as fallback)
  await prisma.loan.update({ where: { id: loan.id }, data: { reminderSentAt: new Date() } });

  try {
    await prisma.loanReminder.create({ data: { loanId: loan.id, type } });
  } catch { /* LoanReminder table may not exist yet */ }

  const dateStr = loan.dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const gameName = loan.game.name;

  try {
    await prisma.userNotification.create({
      data: {
        userId: loan.user.id,
        type: "LOAN_REMINDER",
        title: `⏰ Rappel : rendez "${gameName}" avant le ${dateStr}`,
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
          title: isOverdue ? "⚠️ Emprunt en retard" : "⏰ Rappel d'emprunt",
          body: isOverdue
            ? `"${gameName}" aurait dû être rendu le ${dateStr}`
            : `Pensez à rendre "${gameName}" avant le ${dateStr}`,
          sound: "default",
          channelId: "default",
          data: { type: "loan_reminder", loanId: loan.id },
        }),
      });
    } catch { /* push failure non-bloquant */ }
  }

  return NextResponse.json({ success: true, type });
}

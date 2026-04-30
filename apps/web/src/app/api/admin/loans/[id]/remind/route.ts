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
      user: { select: { name: true, email: true } },
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

  await prisma.loanReminder.create({ data: { loanId: loan.id, type } });

  return NextResponse.json({ success: true, type });
}

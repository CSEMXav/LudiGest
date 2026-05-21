import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  reminderDaysBefore: 2,
  overdueFrequencyDays: 1,
  reminderSubject: 'Rappel : rendez "{{gameName}}" avant le {{dueAt}}',
  reminderBody: "Bonjour {{userName}},\n\nVotre emprunt du jeu \"{{gameName}}\" arrive à échéance le {{dueAt}}.\nPensez à le rendre à la ludothèque ou à le prolonger depuis l'application.\n\nLudothèque BRED",
  overdueSubject: '⚠ Retard : veuillez rendre "{{gameName}}"',
  overdueBody: "Bonjour {{userName}},\n\nLe jeu \"{{gameName}}\" aurait dû être rendu le {{dueAt}}.\nMerci de le rapporter à la ludothèque dès que possible.\n\nLudothèque BRED",
  sessionInviteSubject: '🎲 Invitation session : "{{sessionName}}" — le {{sessionDate}}',
  sessionInviteBody: "Bonjour {{userName}},\n\nVous avez été invité(e) à la session ludique \"{{sessionName}}\".\n\nDate : {{sessionDate}}\nHeure : {{sessionTime}}\nLieu : {{sessionLocation}}\n\nCliquez ici pour vous inscrire : {{registerUrl}}\n\nLudothèque BRED",
  sessionReminderSubject: '⏰ Rappel session : "{{sessionName}}" c\'est bientôt !',
  sessionReminderBody: "Bonjour {{userName}},\n\nRappel : vous êtes inscrit(e) à la session ludique \"{{sessionName}}\".\n\nDate : {{sessionDate}}\nHeure : {{sessionTime}}\nLieu : {{sessionLocation}}\n\nLudothèque BRED",
  manualOverdueSubject: '⚠ Retard (rappel admin) : veuillez rendre "{{gameName}}"',
  manualOverdueBody: "Bonjour {{userName}},\n\nCe rappel vous est envoyé par l'administrateur de la ludothèque.\n\nLe jeu \"{{gameName}}\" aurait dû être rendu le {{dueAt}}.\nMerci de le rapporter dès que possible.\n\nLudothèque BRED",
  waitlistSubject: '💡 Quelqu\'un attend "{{gameName}}" — pensez à le rendre !',
  waitlistBody: "Bonjour {{userName}},\n\nUn(e) collègue attend de pouvoir emprunter le jeu que vous avez actuellement :\n\n{{gameName}}\n\nSi vous avez fini de jouer, pensez à le ramener à la ludothèque !\n\nVoir le jeu : {{gameUrl}}\n\nLudothèque BRED",
  sessionReminderDays1: 7,
  sessionReminderDays2: 1,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const config = await prisma.emailConfig.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(config ?? { id: "singleton", ...DEFAULTS });
  } catch {
    return NextResponse.json({ error: "Base de données indisponible." }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["reminderDaysBefore", "overdueFrequencyDays", "sendHour", "reminderSubject", "reminderBody", "overdueSubject", "overdueBody", "sessionInviteSubject", "sessionInviteBody", "sessionReminderSubject", "sessionReminderBody", "manualOverdueSubject", "manualOverdueBody", "waitlistSubject", "waitlistBody", "sessionReminderDays1", "sessionReminderDays2"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const numericFields = ["reminderDaysBefore", "overdueFrequencyDays", "sessionReminderDays1", "sessionReminderDays2"];
  for (const key of numericFields) {
    if (key in data) {
      const n = Number(data[key]);
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        delete data[key]; // silently drop invalid values
      } else {
        data[key] = n;
      }
    }
  }

  try {
    const config = await prisma.emailConfig.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...DEFAULTS, ...data },
    });
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Table non disponible — déployez d'abord le schéma." }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  reminderDaysBefore: 2,
  overdueFrequencyDays: 3,
  reminderSubject: 'Rappel : rendez "{{gameName}}" avant le {{dueAt}}',
  reminderBody: "Bonjour {{userName}},\n\nVotre emprunt du jeu \"{{gameName}}\" arrive à échéance le {{dueAt}}.\nPensez à le rendre à la ludothèque ou à le prolonger depuis l'application.\n\nLudothèque BRED",
  overdueSubject: '⚠ Retard : veuillez rendre "{{gameName}}"',
  overdueBody: "Bonjour {{userName}},\n\nLe jeu \"{{gameName}}\" aurait dû être rendu le {{dueAt}}.\nMerci de le rapporter à la ludothèque dès que possible.\n\nLudothèque BRED",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const config = await prisma.emailConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json(config ?? { id: "singleton", ...DEFAULTS });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["reminderDaysBefore", "overdueFrequencyDays", "reminderSubject", "reminderBody", "overdueSubject", "overdueBody"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const config = await prisma.emailConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...DEFAULTS, ...data },
  });

  return NextResponse.json(config);
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDeadlineInput, sessionStartUtc } from "@/lib/session-utils";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { name, date, location, startTime, imageUrl, info, registrationDeadline } = await req.json();

  const deadline = parseDeadlineInput(registrationDeadline);
  if (!deadline.ok) return NextResponse.json({ error: deadline.error }, { status: 400 });

  const current = await prisma.gameSession.findUnique({ where: { id: params.id }, select: { date: true, startTime: true, registrationDeadline: true } });
  if (!current) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  const nextDate = date ? new Date(date) : current.date;
  const nextStart = startTime || current.startTime;
  const nextDeadline = deadline.value === undefined ? current.registrationDeadline : deadline.value;
  if (nextDeadline && nextDeadline.getTime() > sessionStartUtc({ date: nextDate, startTime: nextStart }).getTime()) {
    return NextResponse.json({ error: "La fin des inscriptions doit être avant le début de la session." }, { status: 400 });
  }

  const session = await prisma.gameSession.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(location && { location }),
      ...(startTime && { startTime }),
      imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
      info: info !== undefined ? (info || null) : undefined,
      ...(deadline.value !== undefined && { registrationDeadline: deadline.value }),
    },
  });

  return NextResponse.json({ ...session, registrationDeadline: session.registrationDeadline?.toISOString() ?? null });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  await prisma.gameSession.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

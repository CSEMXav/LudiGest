import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { name, date, location, startTime, imageUrl, info } = await req.json();

  const session = await prisma.gameSession.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(date && { date: new Date(date) }),
      ...(location && { location }),
      ...(startTime && { startTime }),
      imageUrl: imageUrl !== undefined ? (imageUrl || null) : undefined,
      info: info !== undefined ? (info || null) : undefined,
    },
  });

  return NextResponse.json(session);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  await prisma.gameSession.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

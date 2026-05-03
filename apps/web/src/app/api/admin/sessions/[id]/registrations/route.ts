import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const registrations = await prisma.gameSessionRegistration.findMany({
    where: { sessionId: params.id },
    include: { user: { select: { name: true, email: true, nickname: true } } },
    orderBy: { registeredAt: "asc" },
  });

  return NextResponse.json(
    registrations.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      userName: r.user.name,
      userEmail: r.user.email,
      userNickname: r.user.nickname,
      guestName: r.guestName,
      registeredAt: r.registeredAt.toISOString(),
    }))
  );
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { registrationId } = await req.json();
  await prisma.gameSessionRegistration.delete({ where: { id: registrationId } });
  return NextResponse.json({ success: true });
}

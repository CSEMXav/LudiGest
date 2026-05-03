import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

async function getUserId(req: NextRequest): Promise<string | null> {
  const mobilePayload = await verifyMobileToken(req);
  if (mobilePayload) return mobilePayload.id;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// DELETE — creator removes an invitation
export async function DELETE(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const callerId = await getUserId(req);
  if (!callerId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const gameSession = await prisma.gameSession.findUnique({ where: { id: params.id } });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  if (gameSession.createdByUserId !== callerId) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  await prisma.privateSessionInvitation.deleteMany({
    where: { sessionId: params.id, userId: params.userId },
  });

  return NextResponse.json({ success: true });
}

// PATCH — invited user accepts or declines
export async function PATCH(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const callerId = await getUserId(req);
  if (!callerId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (callerId !== params.userId) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { status } = await req.json();
  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  const inv = await prisma.privateSessionInvitation.findUnique({
    where: { sessionId_userId: { sessionId: params.id, userId: params.userId } },
  });
  if (!inv) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });

  await prisma.privateSessionInvitation.update({
    where: { sessionId_userId: { sessionId: params.id, userId: params.userId } },
    data: { status },
  });

  return NextResponse.json({ success: true });
}

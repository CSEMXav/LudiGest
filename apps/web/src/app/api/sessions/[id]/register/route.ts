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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { guestName } = await req.json().catch(() => ({ guestName: null }));

  const session = await prisma.gameSession.findUnique({ where: { id: params.id } });
  if (!session) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  try {
    const reg = await prisma.gameSessionRegistration.create({
      data: { sessionId: params.id, userId, guestName: guestName || null },
    });
    return NextResponse.json(reg, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Vous êtes déjà inscrit(e) à cette session." }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const existing = await prisma.gameSessionRegistration.findUnique({
    where: { sessionId_userId: { sessionId: params.id, userId } },
  });
  if (!existing) return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });

  await prisma.gameSessionRegistration.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}

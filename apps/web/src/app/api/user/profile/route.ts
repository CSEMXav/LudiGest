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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      nickname: true,
      visibleInMembers: true,
      matricule: true,
      role: true,
      location: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json();
  const { nickname, visibleInMembers } = body;

  const data: Record<string, unknown> = {};
  if (nickname !== undefined) data.nickname = String(nickname).trim() || null;
  if (visibleInMembers !== undefined) data.visibleInMembers = Boolean(visibleInMembers);

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, nickname: true, visibleInMembers: true, matricule: true },
  });

  return NextResponse.json(user);
}

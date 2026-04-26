import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { LOCATIONS } from "@ludigest/types";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { location } = await req.json();
  if (!location || !LOCATIONS.includes(location)) {
    return NextResponse.json({ error: "Lieu invalide." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { location } });

  return NextResponse.json({ success: true, location });
}

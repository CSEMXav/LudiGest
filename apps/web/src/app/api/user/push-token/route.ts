import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pushToken } = body;

  if (!pushToken) return NextResponse.json({ error: "Token requis." }, { status: 400 });

  let userId: string | null = null;
  const mobilePayload = await verifyMobileToken(req);
  if (mobilePayload) {
    userId = mobilePayload.id;
  } else {
    const session = await getServerSession(authOptions);
    if (session?.user) userId = session.user.id;
  }

  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  await prisma.user.update({ where: { id: userId }, data: { pushToken } });
  return NextResponse.json({ success: true });
}

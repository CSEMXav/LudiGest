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

  const sessions = await prisma.gameSession.findMany({
    orderBy: { date: "asc" },
    include: {
      registrations: {
        select: { id: true, userId: true, guestName: true, registeredAt: true },
      },
    },
  });

  const result = sessions.map((s) => {
    const mine = s.registrations.find((r) => r.userId === userId);
    return {
      id: s.id,
      name: s.name,
      date: s.date.toISOString(),
      location: s.location,
      startTime: s.startTime,
      imageUrl: s.imageUrl,
      info: s.info,
      createdAt: s.createdAt.toISOString(),
      registrationCount: s.registrations.length,
      myRegistration: mine
        ? { id: mine.id, sessionId: s.id, userId: mine.userId, guestName: mine.guestName, registeredAt: mine.registeredAt.toISOString() }
        : null,
    };
  });

  return NextResponse.json(result);
}

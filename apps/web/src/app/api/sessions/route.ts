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

  try {
    const sessions = await prisma.gameSession.findMany({
      where: {
        OR: [
          { isPrivate: false },
          { createdByUserId: userId },
          { invitations: { some: { userId, status: { not: "DECLINED" } } } },
        ],
      },
      orderBy: { date: "asc" },
      include: {
        registrations: { select: { id: true, userId: true, guestName: true, registeredAt: true } },
        invitations: { where: { userId }, select: { status: true } },
      },
    });

    const result = sessions.map((s) => {
      const mine = s.registrations.find((r) => r.userId === userId);
      const myInv = s.invitations[0] ?? null;
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
        isPrivate: s.isPrivate,
        createdByUserId: s.createdByUserId,
        maxParticipants: s.maxParticipants,
        isCreator: s.createdByUserId === userId,
        myInvitation: myInv ? { status: myInv.status } : null,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/sessions error:", err);
    // Fallback: return public sessions without private session fields
    try {
      const sessions = await prisma.gameSession.findMany({
        orderBy: { date: "asc" },
        include: { _count: { select: { registrations: true } }, registrations: { where: { userId }, select: { id: true, userId: true, guestName: true, registeredAt: true } } },
      });
      return NextResponse.json(sessions.map((s) => ({
        id: s.id, name: s.name, date: s.date.toISOString(), location: s.location,
        startTime: s.startTime, imageUrl: s.imageUrl, info: s.info,
        createdAt: s.createdAt.toISOString(),
        registrationCount: s._count.registrations,
        myRegistration: s.registrations[0] ? { id: s.registrations[0].id, sessionId: s.id, userId: s.registrations[0].userId, guestName: s.registrations[0].guestName, registeredAt: s.registrations[0].registeredAt.toISOString() } : null,
        isPrivate: false, createdByUserId: null, maxParticipants: null, isCreator: false, myInvitation: null,
      })));
    } catch (err2) {
      console.error("GET /api/sessions fallback error:", err2);
      return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, date, location, startTime, imageUrl, info, maxParticipants } = body;

  if (!name || !date || !location || !startTime) {
    return NextResponse.json({ error: "Champs obligatoires manquants." }, { status: 400 });
  }

  try {
  const session = await prisma.gameSession.create({
    data: {
      name,
      date: new Date(date),
      location,
      startTime,
      imageUrl: imageUrl || null,
      info: info || null,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      isPrivate: true,
      createdByUserId: userId,
    },
  });

  return NextResponse.json({
    id: session.id,
    name: session.name,
    date: session.date.toISOString(),
    location: session.location,
    startTime: session.startTime,
    imageUrl: session.imageUrl,
    info: session.info,
    createdAt: session.createdAt.toISOString(),
    registrationCount: 0,
    myRegistration: null,
    isPrivate: true,
    createdByUserId: session.createdByUserId,
    maxParticipants: session.maxParticipants,
    isCreator: true,
    myInvitation: null,
  }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sessions error:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la session." }, { status: 500 });
  }
}

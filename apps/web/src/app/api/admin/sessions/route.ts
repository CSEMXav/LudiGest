import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const sessions = await prisma.gameSession.findMany({
      orderBy: { date: "asc" },
      include: {
        _count: { select: { registrations: true } },
        createdBy: { select: { name: true, nickname: true } },
      },
    });

    const adminSessions = sessions
      .filter((s) => !s.isPrivate)
      .map((s) => ({
        id: s.id,
        name: s.name,
        date: s.date.toISOString(),
        location: s.location,
        startTime: s.startTime,
        imageUrl: s.imageUrl,
        info: s.info,
        createdAt: s.createdAt.toISOString(),
        registrationCount: s._count.registrations,
        isPrivate: false as const,
        createdByUserId: null,
        createdByName: null as string | null,
        maxParticipants: null,
        isCreator: false,
        myInvitation: null,
        myRegistration: null,
      }));

    const privateSessions = sessions
      .filter((s) => s.isPrivate)
      .map((s) => ({
        id: s.id,
        name: s.name,
        date: s.date.toISOString(),
        location: s.location,
        startTime: s.startTime,
        imageUrl: s.imageUrl,
        info: s.info,
        createdAt: s.createdAt.toISOString(),
        registrationCount: s._count.registrations,
        isPrivate: true as const,
        createdByUserId: s.createdByUserId,
        createdByName: s.createdBy ? (s.createdBy.nickname ?? s.createdBy.name) : null,
        maxParticipants: s.maxParticipants,
        isCreator: false,
        myInvitation: null,
        myRegistration: null,
      }));

    return NextResponse.json({ adminSessions, privateSessions });
  } catch (err) {
    console.error("GET /api/admin/sessions error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { name, date, location, startTime, imageUrl, info } = body;
  if (!name || !date || !location || !startTime) {
    return NextResponse.json({ error: "Nom, date, lieu et heure sont requis." }, { status: 400 });
  }

  try {
    const session = await prisma.gameSession.create({
      data: { name, date: new Date(date), location, startTime, imageUrl: imageUrl || null, info: info || null },
    });

    return NextResponse.json({
      id: session.id, name: session.name, date: session.date.toISOString(),
      location: session.location, startTime: session.startTime,
      imageUrl: session.imageUrl, info: session.info,
      createdAt: session.createdAt.toISOString(), registrationCount: 0,
      isPrivate: false, createdByUserId: null, maxParticipants: null,
      isCreator: false, myInvitation: null, myRegistration: null,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/sessions error:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la session." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { sendSessionUpdateEmail } from "@/lib/email";

async function getAuthInfo(req: NextRequest): Promise<{ userId: string; role: "USER" | "ADMIN" } | null> {
  const mobilePayload = await verifyMobileToken(req);
  if (mobilePayload) return { userId: mobilePayload.id, role: mobilePayload.role };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return { userId: session.user.id, role: session.user.role ?? "USER" };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthInfo(req);
  if (!auth) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { userId, role } = auth;

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: params.id },
    include: {
      registrations: { select: { id: true, userId: true, guestName: true, registeredAt: true } },
    },
  });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  const isCreator = gameSession.createdByUserId === userId;
  const isAdmin = role === "ADMIN";

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Accès refusé. Seul le créateur ou un administrateur peut modifier cette session." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, date, location, startTime, imageUrl, info, maxParticipants } = body;

  // Build update data with only provided fields
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (date !== undefined) updateData.date = new Date(date);
  if (location !== undefined) updateData.location = location;
  if (startTime !== undefined) updateData.startTime = startTime;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
  if (info !== undefined) updateData.info = info || null;
  if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants ? Number(maxParticipants) : null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const updated = await prisma.gameSession.update({
      where: { id: params.id },
      data: updateData,
      include: {
        registrations: { select: { id: true, userId: true, guestName: true, registeredAt: true } },
      },
    });

    // Notify all registered users
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const sessionsUrl = `${baseUrl}/sessions`;
    const newDateStr = updated.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const registeredUserIds = updated.registrations
      .filter((r) => r.userId && r.userId !== userId)
      .map((r) => r.userId as string);

    for (const registeredUserId of registeredUserIds) {
      const user = await prisma.user.findUnique({
        where: { id: registeredUserId },
        select: { email: true, name: true, firstName: true, nickname: true, pushToken: true },
      });
      if (!user) continue;

      const userName = user.nickname ?? user.firstName ?? user.name ?? "Membre";

      // Email notification
      try {
        await sendSessionUpdateEmail(
          user.email,
          userName,
          updated.name,
          newDateStr,
          updated.startTime,
          updated.location,
          sessionsUrl
        );
      } catch (err) {
        console.error(`[PATCH /api/sessions/${params.id}] Email error for ${user.email}:`, err);
      }

      // In-app notification
      try {
        await prisma.userNotification.create({
          data: {
            userId: registeredUserId,
            type: "SESSION_UPDATE",
            title: `📝 Session mise à jour : ${updated.name}`,
            message: `Nouvelle date : ${newDateStr} à ${updated.startTime} — ${updated.location}`,
            sessionId: updated.id,
          },
        });
      } catch {
        /* ignore notification errors */
      }

      // Push notification
      if (user.pushToken) {
        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: user.pushToken,
              title: `📝 Session mise à jour : ${updated.name}`,
              body: `${newDateStr} à ${updated.startTime} — ${updated.location}`,
              sound: "default",
              channelId: "default",
              data: { type: "session_reminder", sessionId: updated.id },
            }),
          });
        } catch {
          /* push failure non-bloquant */
        }
      }
    }

    const myRegistration = updated.registrations.find((r) => r.userId === userId);

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      date: updated.date.toISOString(),
      location: updated.location,
      startTime: updated.startTime,
      imageUrl: updated.imageUrl,
      info: updated.info,
      createdAt: updated.createdAt.toISOString(),
      registrationCount: updated.registrations.length,
      myRegistration: myRegistration
        ? {
            id: myRegistration.id,
            sessionId: updated.id,
            userId: myRegistration.userId,
            guestName: myRegistration.guestName,
            registeredAt: myRegistration.registeredAt.toISOString(),
          }
        : null,
      isPrivate: updated.isPrivate,
      createdByUserId: updated.createdByUserId,
      maxParticipants: updated.maxParticipants,
      isCreator,
      myInvitation: null,
    });
  } catch (err) {
    console.error(`[PATCH /api/sessions/${params.id}] Error:`, err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la session." }, { status: 500 });
  }
}

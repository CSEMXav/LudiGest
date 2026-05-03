import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { sendConfiguredSessionInviteEmail } from "@/lib/email";

async function getUserId(req: NextRequest): Promise<string | null> {
  const mobilePayload = await verifyMobileToken(req);
  if (mobilePayload) return mobilePayload.id;
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// GET — list invitations for a private session (creator only)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const gameSession = await prisma.gameSession.findUnique({ where: { id: params.id } });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  if (gameSession.createdByUserId !== userId) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const invitations = await prisma.privateSessionInvitation.findMany({
    where: { sessionId: params.id },
    include: { user: { select: { nickname: true, email: true, name: true } } },
    orderBy: { invitedAt: "asc" },
  });

  return NextResponse.json(
    invitations.map((inv) => ({
      id: inv.id,
      sessionId: inv.sessionId,
      userId: inv.userId,
      nickname: inv.user.nickname ?? inv.user.email,
      email: inv.user.email,
      status: inv.status,
      invitedAt: inv.invitedAt.toISOString(),
    }))
  );
}

// POST — invite members (creator only)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const gameSession = await prisma.gameSession.findUnique({ where: { id: params.id } });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
  if (!gameSession.isPrivate) return NextResponse.json({ error: "Session non privée." }, { status: 400 });
  if (gameSession.createdByUserId !== userId) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { userIds } = await req.json();
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "Aucun membre sélectionné." }, { status: 400 });
  }

  const creator = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true } });
  const inviterName = creator?.nickname ?? creator?.name ?? "Un membre";
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const registerUrl = `${baseUrl}/sessions`;
  const dateStr = gameSession.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  let sent = 0;
  for (const invitedUserId of userIds) {
    // Skip if already invited
    const existing = await prisma.privateSessionInvitation.findUnique({
      where: { sessionId_userId: { sessionId: params.id, userId: invitedUserId } },
    });
    if (existing) continue;

    const invitedUser = await prisma.user.findUnique({
      where: { id: invitedUserId },
      select: { id: true, email: true, name: true, firstName: true, nickname: true, pushToken: true },
    });
    if (!invitedUser) continue;

    await prisma.privateSessionInvitation.create({
      data: { sessionId: params.id, userId: invitedUserId, status: "PENDING" },
    });

    // Email
    try {
      await sendConfiguredSessionInviteEmail(invitedUser.email, {
        userName: invitedUser.firstName ?? invitedUser.name,
        sessionName: gameSession.name,
        sessionDate: dateStr,
        sessionTime: gameSession.startTime,
        sessionLocation: gameSession.location,
        registerUrl,
        inviterName,
      });
    } catch (err) { console.error("Email error:", err); }

    // Notification
    try {
      await prisma.userNotification.create({
        data: {
          userId: invitedUserId,
          type: "SESSION_INVITE",
          title: `🔒 Invitation privée : ${gameSession.name}`,
          message: `${dateStr} à ${gameSession.startTime} — invité(e) par ${inviterName}`,
          sessionId: params.id,
        },
      });
    } catch { /* ignore */ }

    // Push
    if (invitedUser.pushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: invitedUser.pushToken,
            title: `🔒 Invitation : ${gameSession.name}`,
            body: `${dateStr} à ${gameSession.startTime}`,
            data: { type: "session_invite", sessionId: params.id },
          }),
        });
      } catch { /* ignore */ }
    }

    sent++;
  }

  return NextResponse.json({ success: true, sent });
}

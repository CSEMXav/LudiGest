import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSessionInviteEmail } from "@/lib/email";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const gameSession = await prisma.gameSession.findUnique({ where: { id: params.id } });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const registerUrl = `${baseUrl}/sessions`;

  // Get all active, verified users
  const users = await prisma.user.findMany({
    where: { suspended: false, emailVerified: true },
    select: { id: true, email: true, name: true, firstName: true, pushToken: true },
  });

  let emailsSent = 0;
  let pushSent = 0;

  const dateStr = gameSession.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const notifTitle = `🎲 Nouvelle session ludique : ${gameSession.name}`;
  const notifMessage = `${dateStr} à ${gameSession.startTime} — ${gameSession.location}`;

  const emailPromises = users.map(async (user) => {
    try {
      await sendSessionInviteEmail(
        user.email,
        user.firstName ?? user.name,
        gameSession.name,
        gameSession.date,
        gameSession.location,
        gameSession.startTime,
        registerUrl
      );
      emailsSent++;
    } catch (err) {
      console.error(`Failed to send invite to ${user.email}:`, err);
    }
    // Save notification record
    try {
      await prisma.userNotification.create({
        data: {
          userId: user.id,
          type: "SESSION_INVITE",
          title: notifTitle,
          message: notifMessage,
          sessionId: gameSession.id,
        },
      });
    } catch { /* ignore duplicate */ }
  });

  await Promise.all(emailPromises);

  // Send push notifications via Expo Push API
  const pushTokens = users.map((u) => u.pushToken).filter(Boolean) as string[];
  if (pushTokens.length > 0) {
    try {
      const dateStr = gameSession.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const messages = pushTokens.map((token) => ({
        to: token,
        title: "🎲 Nouvelle session ludique !",
        body: `${gameSession.name} — ${dateStr} à ${gameSession.startTime}`,
        data: { type: "session_invite", sessionId: gameSession.id },
      }));

      // Batch in groups of 100 (Expo limit)
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        if (res.ok) pushSent += batch.length;
      }
    } catch (err) {
      console.error("Push notification error:", err);
    }
  }

  return NextResponse.json({ success: true, emailsSent, pushSent });
}

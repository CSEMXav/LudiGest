import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSessionReminderEmail } from "@/lib/email";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: params.id },
    include: {
      registrations: {
        include: { user: { select: { email: true, name: true, firstName: true, pushToken: true } } },
      },
    },
  });
  if (!gameSession) return NextResponse.json({ error: "Session introuvable." }, { status: 404 });

  let emailsSent = 0;
  let pushSent = 0;

  const dateStr = gameSession.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const notifTitle = `⏰ Rappel session : ${gameSession.name}`;
  const notifMessage = `${dateStr} à ${gameSession.startTime} — ${gameSession.location}`;

  const emailPromises = gameSession.registrations.map(async (reg) => {
    try {
      await sendSessionReminderEmail(
        reg.user.email,
        reg.user.firstName ?? reg.user.name,
        gameSession.name,
        gameSession.date,
        gameSession.location,
        gameSession.startTime
      );
      emailsSent++;
    } catch (err) {
      console.error(`Failed to send reminder to ${reg.user.email}:`, err);
    }
    try {
      await prisma.userNotification.create({
        data: {
          userId: reg.userId,
          type: "SESSION_REMINDER",
          title: notifTitle,
          message: notifMessage,
          sessionId: gameSession.id,
        },
      });
    } catch { /* ignore */ }
  });

  await Promise.all(emailPromises);

  // Push notifications to registered users
  const pushTokens = gameSession.registrations
    .map((r) => r.user.pushToken)
    .filter(Boolean) as string[];

  if (pushTokens.length > 0) {
    try {
      const dateStr = gameSession.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const messages = pushTokens.map((token) => ({
        to: token,
        title: "⏰ Rappel session ludique",
        body: `${gameSession.name} — ${dateStr} à ${gameSession.startTime}`,
        data: { type: "session_reminder", sessionId: gameSession.id },
      }));

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

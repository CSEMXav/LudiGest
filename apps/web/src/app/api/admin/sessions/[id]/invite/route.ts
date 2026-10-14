import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSessionInviteEmail, isAlreadySentToday } from "@/lib/email";
import { formatDeadlineFr, parisLocalToUtc } from "@/lib/session-utils";

// Les envois d'emails sont cadencés (limite de débit du service) : on laisse le temps de tous les traiter
export const maxDuration = 60;

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

  // Membres actifs, sauf ceux déjà invités à cette session aujourd'hui (double clic, renvoi…)
  const startOfDay = parisLocalToUtc(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }), "00:00");
  const alreadyInvited = await prisma.userNotification.findMany({
    where: { type: "SESSION_INVITE", sessionId: gameSession.id, createdAt: { gte: startOfDay } },
    select: { userId: true },
  });
  const alreadyIds = new Set(alreadyInvited.map((n) => n.userId));
  const users = (await prisma.user.findMany({
    where: { suspended: false, emailVerified: true },
    select: { id: true, email: true, name: true, firstName: true, pushToken: true },
  })).filter((u) => !alreadyIds.has(u.id));
  if (users.length === 0) {
    return NextResponse.json({ error: "Tous les membres ont déjà reçu l'invitation à cette session aujourd'hui." }, { status: 409 });
  }

  let emailsSent = 0;
  let pushSent = 0;
  let failed = 0;
  // Seuls les membres effectivement prévenus reçoivent la notification et la push ;
  // un envoi raté pourra être relancé sans recontacter les autres.
  const notified: typeof users = [];

  const dateStr = gameSession.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const deadlineStr = gameSession.registrationDeadline ? formatDeadlineFr(gameSession.registrationDeadline) : null;
  const notifTitle = `🎲 Nouvelle session ludique : ${gameSession.name}`;
  const notifMessage = `${dateStr} à ${gameSession.startTime} — ${gameSession.location}${deadlineStr ? ` · Inscriptions jusqu'au ${deadlineStr}` : ""}`;

  const emailPromises = users.map(async (user) => {
    try {
      await sendSessionInviteEmail(
        user.email,
        user.firstName ?? user.name,
        gameSession.name,
        gameSession.date,
        gameSession.location,
        gameSession.startTime,
        registerUrl,
        deadlineStr,
        gameSession.imageUrl
      );
      emailsSent++;
    } catch (err) {
      if (!isAlreadySentToday(err)) {
        failed++;
        console.error(`Failed to send invite to ${user.email}:`, err);
        return;
      }
    }
    notified.push(user);
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
  const pushTokens = notified.map((u) => u.pushToken).filter(Boolean) as string[];
  if (pushTokens.length > 0) {
    try {
      const dateStr = gameSession.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const messages = pushTokens.map((token) => ({
        to: token,
        title: "🎲 Nouvelle session ludique !",
        body: `${gameSession.name} — ${dateStr} à ${gameSession.startTime}${deadlineStr ? ` · Inscriptions jusqu'au ${deadlineStr}` : ""}`,
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

  return NextResponse.json({ success: true, emailsSent, pushSent, failed, alreadyInvited: alreadyIds.size });
}

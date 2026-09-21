import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderNewGamesEmail, sendNewGamesEmail, type NewGameCard } from "@/lib/email";

type Mode = "preview" | "test" | "send";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

function toCard(g: { id: string; name: string; category: string; summary: string | null; minAge: number | null; minPlayers: number | null; maxPlayers: number | null; duration: number | null; coverUrl: string | null }): NewGameCard {
  return { id: g.id, name: g.name, category: g.category, summary: g.summary, minAge: g.minAge, minPlayers: g.minPlayers, maxPlayers: g.maxPlayers, duration: g.duration, coverUrl: g.coverUrl };
}

/**
 * POST /api/admin/games/announce
 * body: { gameIds: string[]; mode: "preview" | "test" | "send"; onlyLocation?: boolean }
 *  - preview : renvoie { subject, html, recipients }
 *  - test    : envoie l'email uniquement à l'admin connecté
 *  - send    : envoie à tous les membres actifs (option : uniquement ceux de la ludothèque des jeux)
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const gameIds: string[] = Array.isArray(body.gameIds) ? body.gameIds.filter((x: unknown) => typeof x === "string") : [];
  const mode: Mode = body.mode === "test" || body.mode === "send" ? body.mode : "preview";
  const onlyLocation = body.onlyLocation !== false;

  if (gameIds.length === 0) return NextResponse.json({ error: "Sélectionnez au moins un jeu." }, { status: 400 });
  if (gameIds.length > 30) return NextResponse.json({ error: "30 jeux maximum par annonce." }, { status: 400 });

  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    orderBy: { addedAt: "desc" },
  });
  if (games.length === 0) return NextResponse.json({ error: "Aucun jeu trouvé." }, { status: 404 });

  const cards = games.map(toCard);
  const locations = Array.from(new Set(games.map((g) => g.location)));
  const config = await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);

  const adminUser = await prisma.user.findUnique({ where: { id: admin.id }, select: { email: true, name: true, firstName: true } });
  const adminName = adminUser?.firstName ?? adminUser?.name ?? "Admin";

  const recipientWhere = {
    suspended: false,
    emailVerified: true,
    ...(onlyLocation && locations.length === 1 ? { location: locations[0] } : {}),
  };

  if (mode === "preview") {
    const recipients = await prisma.user.count({ where: recipientWhere });
    const { subject, html } = renderNewGamesEmail(config, { userName: adminName }, cards);
    return NextResponse.json({ subject, html, recipients, gamesCount: cards.length, locations });
  }

  if (mode === "test") {
    if (!adminUser?.email) return NextResponse.json({ error: "Email admin introuvable." }, { status: 400 });
    await sendNewGamesEmail(adminUser.email, { userName: adminName }, cards, config);
    return NextResponse.json({ success: true, sentTo: adminUser.email });
  }

  // mode === "send"
  const users = await prisma.user.findMany({
    where: recipientWhere,
    select: { id: true, email: true, name: true, firstName: true, pushToken: true },
  });

  let emailsSent = 0;
  let pushSent = 0;
  const gameNames = games.map((g) => g.name);
  const notifTitle = `🆕 ${games.length > 1 ? `${games.length} nouveaux jeux` : "Nouveau jeu"} à la ludothèque`;
  const notifMessage = gameNames.slice(0, 5).join(", ") + (gameNames.length > 5 ? ` et ${gameNames.length - 5} autre(s)` : "");

  // Envoi par lots pour ne pas saturer l'API email
  const BATCH = 20;
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH);
    await Promise.all(batch.map(async (user) => {
      try {
        await sendNewGamesEmail(user.email, { userName: user.firstName ?? user.name }, cards, config);
        emailsSent++;
      } catch (err) {
        console.error(`Failed to send new-games email to ${user.email}:`, err);
      }
      try {
        await prisma.userNotification.create({
          data: { userId: user.id, type: "NEW_GAMES", title: notifTitle, message: notifMessage },
        });
      } catch { /* ignore */ }
    }));
  }

  // Push (Expo)
  const pushTokens = users.map((u) => u.pushToken).filter(Boolean) as string[];
  if (pushTokens.length > 0) {
    try {
      const messages = pushTokens.map((token) => ({
        to: token,
        title: notifTitle,
        body: notifMessage,
        data: { type: "new_games", gameIds: games.map((g) => g.id) },
      }));
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk),
        });
        if (res.ok) pushSent += chunk.length;
      }
    } catch (err) {
      console.error("Push notification error:", err);
    }
  }

  return NextResponse.json({ success: true, emailsSent, pushSent, recipients: users.length });
}

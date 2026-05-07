import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { sendGameAvailableEmail } from "@/lib/email";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const loan = await prisma.loan.findUnique({ where: { id: params.id } });
  if (!loan) return NextResponse.json({ error: "Emprunt introuvable." }, { status: 404 });
  if (loan.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (loan.returnedAt) {
    return NextResponse.json({ error: "Ce jeu a déjà été rendu." }, { status: 409 });
  }

  const [[updated], game, waitlist] = await Promise.all([
    prisma.$transaction([
      prisma.loan.update({ where: { id: params.id }, data: { returnedAt: new Date() } }),
      prisma.game.update({ where: { id: loan.gameId }, data: { status: "AVAILABLE" } }),
    ]),
    prisma.game.findUnique({ where: { id: loan.gameId }, select: { name: true } }),
    prisma.gameWaitlist.findMany({
      where: { gameId: loan.gameId },
      include: { user: { select: { email: true, name: true, firstName: true, pushToken: true } } },
    }),
  ]);

  // Notifier les utilisateurs en liste d'attente
  if (waitlist.length > 0 && game) {
    const gameUrl = `${BASE_URL}/games/${loan.gameId}`;

    await Promise.all(waitlist.map(async (entry) => {
      const u = entry.user;
      const userName = u.firstName ?? u.name;

      try { await sendGameAvailableEmail(u.email, userName, game.name, gameUrl); } catch { /* ignore */ }

      try {
        await prisma.userNotification.create({
          data: {
            userId: entry.userId,
            type: "GAME_AVAILABLE",
            title: `🎲 "${game.name}" est disponible !`,
            message: "Le jeu que vous attendiez vient d'être rendu.",
          },
        });
      } catch { /* ignore */ }

      if (u.pushToken) {
        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{
              to: u.pushToken,
              title: `🎲 "${game.name}" est disponible !`,
              body: "Le jeu que vous attendiez vient d'être rendu.",
              data: { type: "game_available", gameId: loan.gameId },
            }]),
          });
        } catch { /* ignore */ }
      }
    }));

    // Vider la liste d'attente
    await prisma.gameWaitlist.deleteMany({ where: { gameId: loan.gameId } });
  }

  return NextResponse.json({ success: true, returnedAt: updated.returnedAt!.toISOString() });
}

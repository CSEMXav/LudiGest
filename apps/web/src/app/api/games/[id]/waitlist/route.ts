import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { sendConfiguredWaitlistEmail } from "@/lib/email";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: {
      loans: { where: { returnedAt: null }, include: { user: { select: { email: true, name: true, firstName: true, pushToken: true } } }, take: 1 },
    },
  });
  if (!game) return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });

  const existing = await prisma.gameWaitlist.findUnique({
    where: { gameId_userId: { gameId: params.id, userId: user.id } },
  });
  if (existing) return NextResponse.json({ success: true, alreadyRegistered: true });

  await prisma.gameWaitlist.create({ data: { gameId: params.id, userId: user.id } });

  // Notifier l'emprunteur actuel
  const activeLoan = game.loans[0];
  let emailSent = false;
  let emailError: string | null = null;

  if (!activeLoan) {
    console.warn(`[waitlist] Aucun emprunt actif trouvé pour le jeu ${params.id} (${game.name}) — mail non envoyé`);
  } else {
    const gameUrl = `${BASE_URL}/games/${params.id}`;
    const borrower = activeLoan.user;
    const borrowerName = borrower.firstName ?? borrower.name;

    console.log(`[waitlist] Envoi mail à l'emprunteur ${borrower.email} pour "${game.name}"`);

    try {
      await sendConfiguredWaitlistEmail(borrower.email, { userName: borrowerName, gameName: game.name, gameUrl });
      emailSent = true;
      console.log(`[waitlist] Mail envoyé avec succès à ${borrower.email}`);
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error(`[waitlist] Échec envoi mail à ${borrower.email} :`, emailError);
    }

    // Notification in-app pour l'emprunteur
    try {
      await prisma.userNotification.create({
        data: {
          userId: activeLoan.userId,
          type: "GAME_WANTED",
          title: `💡 Quelqu'un attend "${game.name}"`,
          message: "Pensez à le ramener à la ludothèque si vous avez fini !",
        },
      });
    } catch (err) {
      console.error("[waitlist] Échec création notif in-app :", err);
    }

    // Push notification pour l'emprunteur
    if (borrower.pushToken) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([{
            to: borrower.pushToken,
            title: `💡 Quelqu'un attend "${game.name}"`,
            body: "Pensez à le ramener à la ludothèque si vous avez fini !",
            data: { type: "game_wanted", gameId: params.id },
          }]),
        });
      } catch (err) {
        console.error("[waitlist] Échec push notification :", err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    debug: { activeLoanFound: !!activeLoan, emailSent, emailError },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await prisma.gameWaitlist.deleteMany({
    where: { gameId: params.id, userId: user.id },
  });

  return NextResponse.json({ success: true });
}

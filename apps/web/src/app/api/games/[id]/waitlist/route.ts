import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { sendGameWantedEmail } from "@/lib/email";

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
  if (activeLoan) {
    const gameUrl = `${BASE_URL}/games/${params.id}`;
    const borrower = activeLoan.user;
    const borrowerName = borrower.firstName ?? borrower.name;

    try {
      await sendGameWantedEmail(borrower.email, borrowerName, game.name, gameUrl);
    } catch (err) {
      console.error("sendGameWantedEmail error:", err);
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
    } catch { /* ignore */ }

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
      } catch { /* ignore */ }
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await prisma.gameWaitlist.deleteMany({
    where: { gameId: params.id, userId: user.id },
  });

  return NextResponse.json({ success: true });
}

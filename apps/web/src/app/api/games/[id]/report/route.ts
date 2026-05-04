import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { sendGameReportEmail } from "@/lib/email";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { message } = await req.json().catch(() => ({}));
  if (!message?.trim()) return NextResponse.json({ error: "Message requis." }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!game) return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", suspended: false },
    select: { id: true, name: true, email: true },
  });

  if (admins.length === 0) return NextResponse.json({ error: "Aucun administrateur trouvé." }, { status: 500 });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const gameUrl = `${baseUrl}/games/${game.id}`;

  const reporterName = ("name" in user ? user.name : null) ?? user.email ?? "Utilisateur";

  // Save the report record (used to show badge on game detail)
  await prisma.gameReport.create({
    data: { gameId: game.id, reporterId: user.id, reporterName, message: message.trim() },
  }).catch(() => {});

  // Notify all admins via email + UserNotification
  await Promise.all(
    admins.map(async (admin) => {
      await sendGameReportEmail(admin.email, admin.name, reporterName, game.name, gameUrl, message.trim()).catch(() => {});
      await prisma.userNotification.create({
        data: {
          userId: admin.id,
          type: "GAME_REPORT",
          title: `🚨 Signalement : "${game.name}"`,
          message: `${reporterName} : ${message.trim().slice(0, 100)}${message.trim().length > 100 ? "…" : ""}`,
        },
      }).catch(() => {});
    })
  );

  return NextResponse.json({ success: true });
}

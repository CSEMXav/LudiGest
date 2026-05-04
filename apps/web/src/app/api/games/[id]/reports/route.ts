import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const game = await prisma.game.findUnique({ where: { id: params.id }, select: { name: true } });

    let reports: { id: string; reporterName: string; message: string; createdAt: string }[] = [];

    try {
      const dbReports = await prisma.gameReport.findMany({
        where: { gameId: params.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, reporterName: true, message: true, createdAt: true },
      });
      reports = dbReports.map((r) => ({ id: r.id, reporterName: r.reporterName, message: r.message, createdAt: r.createdAt.toISOString() }));
    } catch { /* GameReport table may not exist yet */ }

    // Fallback: legacy reports stored in UserNotification before GameReport table existed
    if (reports.length === 0 && game) {
      try {
        const legacyTitle = `🚨 Signalement : "${game.name}"`;
        const legacyNotifs = await prisma.userNotification.findMany({
          where: { type: "GAME_REPORT", title: legacyTitle },
          distinct: ["message"],
          orderBy: { createdAt: "desc" },
          select: { id: true, message: true, createdAt: true },
        });
        reports = legacyNotifs.map((n) => {
          const reporterMatch = n.message.match(/^(.+?) a signalé/);
          return {
            id: n.id,
            reporterName: reporterMatch ? reporterMatch[1] : "Inconnu",
            message: n.message,
            createdAt: n.createdAt.toISOString(),
          };
        });
      } catch { /* UserNotification fallback failed */ }
    }

    return NextResponse.json(reports);
  } catch {
    return NextResponse.json([]);
  }
}

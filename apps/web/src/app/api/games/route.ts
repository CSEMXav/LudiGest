import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search       = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status");
  const category     = searchParams.get("category");
  const minStars     = searchParams.get("minStars") ? Number(searchParams.get("minStars")) : null;
  const minDuration  = searchParams.get("minDuration") ? Number(searchParams.get("minDuration")) : null;
  const maxDuration  = searchParams.get("maxDuration") ? Number(searchParams.get("maxDuration")) : null;
  const players      = searchParams.get("players") ? Number(searchParams.get("players")) : null;
  const fromDate     = searchParams.get("fromDate");
  const toDate       = searchParams.get("toDate");
  const locationParam = searchParams.get("location");
  const barcodeParam  = searchParams.get("barcode");
  const userLocation = locationParam || user.location;

  const games = await prisma.game.findMany({
    where: {
      location: userLocation,
      ...(barcodeParam ? { barcode: barcodeParam } : {}),
      ...(user.role !== "ADMIN" ? { status: { not: "SUSPENDED" } } : {}),
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { type: { contains: search, mode: "insensitive" } }] } : {}),
      ...(category ? { category } : {}),
      ...(minDuration ? { duration: { gte: minDuration } } : {}),
      ...(maxDuration ? { duration: { lte: maxDuration } } : {}),
      ...(players ? { minPlayers: { lte: players }, maxPlayers: { gte: players } } : {}),
      ...(fromDate ? { addedAt: { gte: new Date(fromDate) } } : {}),
      ...(toDate   ? { addedAt: { lte: new Date(toDate + "T23:59:59Z") } } : {}),
    },
    include: {
      ratings: { select: { stars: true } },
      loans: { where: { returnedAt: null }, select: { dueAt: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  // Get report counts for all users (badge visible to everyone)
  let reportCounts: Record<string, number> = {};
  try {
    const counts = await prisma.gameReport.groupBy({ by: ["gameId"], _count: { id: true } });
    reportCounts = Object.fromEntries(counts.map((c) => [c.gameId, c._count.id]));
  } catch { /* GameReport table may not exist yet */ }

  // Admins also get legacy UserNotification-based reports (before GameReport table existed)
  if (user.role === "ADMIN") {
    try {
      const legacyCounts = await prisma.userNotification.groupBy({
        by: ["title"],
        where: { type: "GAME_REPORT" },
        _count: { id: true },
      });
      for (const lc of legacyCounts) {
        const match = lc.title.match(/🚨 Signalement : "(.+)"$/);
        if (match) {
          const game = games.find((g) => g.name === match[1]);
          if (game && !reportCounts[game.id]) {
            const distinctCount = await prisma.userNotification.findMany({
              where: { type: "GAME_REPORT", title: lc.title },
              distinct: ["message"],
            });
            reportCounts[game.id] = (reportCounts[game.id] ?? 0) + distinctCount.length;
          }
        }
      }
    } catch { /* UserNotification query failed */ }
  }

  let result = games.map((g) => {
    const avg =
      g.ratings.length > 0
        ? Math.round((g.ratings.reduce((s, r) => s + r.stars, 0) / g.ratings.length) * 10) / 10
        : null;
    return {
      id: g.id,
      bggId: g.bggId,
      name: g.name,
      type: g.type,
      category: g.category,
      summary: g.summary,
      minAge: g.minAge,
      minPlayers: g.minPlayers,
      maxPlayers: g.maxPlayers,
      duration: g.duration,
      coverUrl: g.coverUrl,
      barcode: g.barcode,
      status: g.status,
      location: g.location,
      addedAt: g.addedAt.toISOString(),
      averageRating: avg,
      ratingsCount: g.ratings.length,
      reportCount: reportCounts[g.id] ?? 0,
    };
  });

  if (minStars !== null) {
    result = result.filter((g) => g.averageRating !== null && g.averageRating >= minStars);
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { name, type, bggId, summary, minAge, coverUrl, barcode, category, location } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Nom et type requis." }, { status: 400 });
  }

  const game = await prisma.game.create({
    data: {
      name, type, bggId, summary, minAge, coverUrl, barcode,
      category: category ?? "famille",
      location: location ?? user.location,
    },
  });

  return NextResponse.json(game, { status: 201 });
}

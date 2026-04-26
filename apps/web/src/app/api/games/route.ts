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
  const userLocation = (locationParam && user.role === "ADMIN") ? locationParam : user.location;

  const games = await prisma.game.findMany({
    where: {
      location: userLocation,
      ...(user.role !== "ADMIN" ? { status: { not: "SUSPENDED" } } : {}),
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { type: { contains: search } }] } : {}),
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

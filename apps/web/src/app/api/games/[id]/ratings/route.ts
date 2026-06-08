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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ratings = await prisma.rating.findMany({
    where: { gameId: params.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    ratings.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      gameId: r.gameId,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { stars, comment } = await req.json();
  if (!stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "La note doit être entre 1 et 5." }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_gameId: { userId: user.id, gameId: params.id } },
    update: { stars, comment: comment ?? null },
    create: { userId: user.id, gameId: params.id, stars, comment: comment ?? null },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({
    id: rating.id,
    userId: rating.userId,
    userName: rating.user.name,
    gameId: rating.gameId,
    stars: rating.stars,
    comment: rating.comment,
    createdAt: rating.createdAt.toISOString(),
  });
}

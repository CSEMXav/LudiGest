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

  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: {
      ratings: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      loans: {
        where: { returnedAt: null },
        select: { dueAt: true, userId: true },
        take: 1,
      },
    },
  });

  if (!game) return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });
  if (game.status === "SUSPENDED" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Jeu non disponible" }, { status: 404 });
  }

  const averageRating =
    game.ratings.length > 0
      ? Math.round((game.ratings.reduce((s, r) => s + r.stars, 0) / game.ratings.length) * 10) / 10
      : null;

  return NextResponse.json({
    ...game,
    addedAt: game.addedAt.toISOString(),
    averageRating,
    ratingsCount: game.ratings.length,
    ratings: game.ratings.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      gameId: r.gameId,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
    activeLoan: game.loans[0] ? { dueAt: game.loans[0].dueAt.toISOString(), isCurrentUser: game.loans[0].userId === user.id } : null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json();
  const { name, type, status, summary, minAge, coverUrl, barcode, bggId, addedAt,
          category, minPlayers, maxPlayers, duration } = body;

  const game = await prisma.game.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(summary !== undefined && { summary }),
      ...(minAge !== undefined && { minAge }),
      ...(coverUrl !== undefined && { coverUrl }),
      ...(barcode !== undefined && { barcode }),
      ...(bggId !== undefined && { bggId }),
      ...(addedAt !== undefined && { addedAt: new Date(addedAt) }),
      ...(category !== undefined && { category }),
      ...(minPlayers !== undefined && { minPlayers }),
      ...(maxPlayers !== undefined && { maxPlayers }),
      ...(duration !== undefined && { duration }),
    },
  });

  return NextResponse.json(game);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  const activeLoan = await prisma.loan.findFirst({
    where: { gameId: params.id, returnedAt: null },
  });
  if (activeLoan && !force) {
    return NextResponse.json({ error: "Ce jeu est actuellement emprunté." }, { status: 409 });
  }

  if (force) {
    // Delete loan reminders first (via loans), then loans, then ratings, then game
    const loans = await prisma.loan.findMany({ where: { gameId: params.id }, select: { id: true } });
    const loanIds = loans.map((l) => l.id);
    if (loanIds.length > 0) {
      await prisma.loanReminder.deleteMany({ where: { loanId: { in: loanIds } } });
      await prisma.loan.deleteMany({ where: { id: { in: loanIds } } });
    }
    await prisma.rating.deleteMany({ where: { gameId: params.id } });
  }

  await prisma.game.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { sendReminderEmail } from "@/lib/email";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const showAll = searchParams.get("all") === "true";

  const loans = await prisma.loan.findMany({
    where: {
      userId: user.id,
      ...(showAll ? {} : { returnedAt: null }),
    },
    include: {
      game: { select: { name: true, coverUrl: true } },
    },
    orderBy: { borrowedAt: "desc" },
  });

  // Lazy reminder: send email if due within 7 days and not yet sent
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });

  for (const loan of loans) {
    if (!loan.returnedAt && !loan.reminderSentAt) {
      const msUntilDue = loan.dueAt.getTime() - now.getTime();
      if (msUntilDue > 0 && msUntilDue <= sevenDays) {
        await prisma.loan.update({ where: { id: loan.id }, data: { reminderSentAt: now } });
        if (fullUser) {
          sendReminderEmail(fullUser.email, fullUser.name, loan.game.name, loan.dueAt).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json(
    loans.map((l) => ({
      id: l.id,
      userId: l.userId,
      gameId: l.gameId,
      gameName: l.game.name,
      gameCoverUrl: l.game.coverUrl,
      borrowedAt: l.borrowedAt.toISOString(),
      dueAt: l.dueAt.toISOString(),
      returnedAt: l.returnedAt?.toISOString() ?? null,
      extendedCount: l.extendedCount,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { gameId, barcode } = body;

  let game;
  if (barcode) {
    game = await prisma.game.findFirst({ where: { barcode } });
    if (!game) {
      return NextResponse.json({ error: "Aucun jeu trouvé avec ce code-barre." }, { status: 404 });
    }
  } else if (gameId) {
    game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Jeu introuvable." }, { status: 404 });
    }
  } else {
    return NextResponse.json({ error: "gameId ou barcode requis." }, { status: 400 });
  }

  if (game.status !== "AVAILABLE") {
    return NextResponse.json(
      { error: game.status === "BORROWED" ? "Ce jeu est déjà emprunté." : "Ce jeu n'est pas disponible." },
      { status: 409 }
    );
  }

  const activeLoans = await prisma.loan.count({
    where: { userId: user.id, returnedAt: null },
  });

  if (activeLoans >= 5) {
    return NextResponse.json(
      { error: "Vous avez atteint la limite de 5 emprunts simultanés." },
      { status: 409 }
    );
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  const [loan] = await prisma.$transaction([
    prisma.loan.create({
      data: { userId: user.id, gameId: game.id, dueAt },
      include: { game: { select: { name: true, coverUrl: true } } },
    }),
    prisma.game.update({ where: { id: game.id }, data: { status: "BORROWED" } }),
  ]);

  return NextResponse.json(
    {
      id: loan.id,
      userId: loan.userId,
      gameId: loan.gameId,
      gameName: (loan as any).game.name,
      gameCoverUrl: (loan as any).game.coverUrl,
      borrowedAt: loan.borrowedAt.toISOString(),
      dueAt: loan.dueAt.toISOString(),
      returnedAt: null,
      extendedCount: 0,
    },
    { status: 201 }
  );
}

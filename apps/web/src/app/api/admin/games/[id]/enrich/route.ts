import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchBGG, getGameDetails } from "@/lib/bgg";
import { translateToFrench } from "@/lib/translate";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const game = await prisma.game.findUnique({ where: { id: params.id } });
  if (!game) return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });

  let bggId = game.bggId ?? null;

  if (!bggId) {
    const results = await searchBGG(game.name);
    if (results.length === 0) {
      return NextResponse.json(
        { error: "Jeu non trouvé automatiquement. Entrez l'ID BGG manuellement via ✏ Modifier (visible dans l'URL boardgamegeek.com/boardgame/XXXXX/...)." },
        { status: 404 }
      );
    }
    bggId = results[0].bggId;
  }

  const details = await getGameDetails(bggId);
  if (!details) {
    return NextResponse.json({ error: "Impossible de récupérer les détails BGG." }, { status: 502 });
  }

  const summaryFr = details.summary ? await translateToFrench(details.summary) : null;

  const updated = await prisma.game.update({
    where: { id: params.id },
    data: {
      bggId:      details.bggId,
      name:       details.name || game.name,
      type:       details.type || game.type,
      summary:    summaryFr,
      minAge:     details.minAge,
      minPlayers: details.minPlayers,
      maxPlayers: details.maxPlayers,
      duration:   details.duration,
      coverUrl:   details.coverUrl,
      ...(details.barcode && !game.barcode ? { barcode: details.barcode } : {}),
    },
  });

  return NextResponse.json(updated);
}

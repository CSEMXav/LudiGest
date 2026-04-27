import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { searchBGG, getGameDetails } from "@/lib/bgg";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { name, category, bggId: bggIdInput } = await req.json();
  if (!name || !category) {
    return NextResponse.json({ error: "Nom et catégorie requis." }, { status: 400 });
  }

  // Parse BGG ID from URL or raw ID
  function parseBggId(input: string): string | null {
    if (!input) return null;
    const m = input.match(/boardgame(?:expansion)?\/(\d+)/);
    if (m) return m[1];
    if (/^\d+$/.test(input.trim())) return input.trim();
    return null;
  }

  // Recherche BGG — utilise l'ID fourni si disponible, sinon recherche par nom
  let bggDetails = null;
  try {
    const manualId = parseBggId(bggIdInput ?? "");
    if (manualId) {
      bggDetails = await getGameDetails(manualId);
    } else {
      const results = await searchBGG(name);
      if (results.length > 0) {
        bggDetails = await getGameDetails(results[0].bggId);
      }
    }
  } catch {
    // BGG unavailable — on crée le jeu avec le minimum
  }

  // Vérifie si barcode déjà utilisé
  const barcode = bggDetails?.barcode ?? null;
  if (barcode) {
    const exists = await prisma.game.findUnique({ where: { barcode } });
    if (exists) bggDetails = { ...bggDetails!, barcode: null };
  }

  // Vérifie si bggId déjà utilisé
  const bggId = bggDetails?.bggId ?? null;
  if (bggId) {
    const exists = await prisma.game.findUnique({ where: { bggId } });
    if (exists) return NextResponse.json({ error: `Ce jeu existe déjà dans la bibliothèque (${exists.name}).` }, { status: 409 });
  }

  const game = await prisma.game.create({
    data: {
      name: bggDetails?.name ?? name,
      type: bggDetails?.type ?? "Jeu de société",
      category,
      summary: bggDetails?.summary ?? null,
      minAge: bggDetails?.minAge ?? null,
      minPlayers: bggDetails?.minPlayers ?? null,
      maxPlayers: bggDetails?.maxPlayers ?? null,
      duration: bggDetails?.duration ?? null,
      coverUrl: bggDetails?.coverUrl ?? null,
      barcode: bggDetails?.barcode ?? null,
      bggId: bggDetails?.bggId ?? null,
      location: user.location,
    },
  });

  return NextResponse.json({
    id: game.id,
    name: game.name,
    coverUrl: game.coverUrl,
    bggFound: !!bggDetails,
  }, { status: 201 });
}

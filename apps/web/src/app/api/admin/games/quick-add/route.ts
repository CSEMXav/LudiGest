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

  const { name, category, bggId: bggIdInput, force } = await req.json();
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

  if (!force) {
    // Vérifie si un jeu avec le même bggId existe déjà dans cette bibliothèque
    const bggId = bggDetails?.bggId ?? null;
    if (bggId) {
      const exists = await prisma.game.findFirst({ where: { bggId, location: user.location } });
      if (exists) {
        return NextResponse.json(
          { error: `Ce jeu existe déjà dans cette bibliothèque (${exists.name}).`, duplicate: { id: exists.id, name: exists.name }, canForce: true },
          { status: 409 }
        );
      }
    }

    // Vérifie si un jeu avec le même nom existe déjà dans cette bibliothèque
    const existsByName = await prisma.game.findFirst({ where: { name: { equals: bggDetails?.name ?? name }, location: user.location } });
    if (existsByName) {
      return NextResponse.json(
        { error: `Un jeu avec ce nom existe déjà dans cette bibliothèque (${existsByName.name}).`, duplicate: { id: existsByName.id, name: existsByName.name }, canForce: true },
        { status: 409 }
      );
    }
  }

  // Si le bggId est déjà utilisé dans une autre bibliothèque, on le met à null
  if (!force && bggDetails?.bggId) {
    const bggIdTaken = await prisma.game.findUnique({ where: { bggId: bggDetails.bggId } });
    if (bggIdTaken) bggDetails = { ...bggDetails, bggId: null };
  }

  // Vérifie si barcode déjà utilisé — dans ce cas on l'écarte sans bloquer
  let barcode = bggDetails?.barcode ?? null;
  if (barcode) {
    const exists = await prisma.game.findFirst({ where: { barcode } });
    if (exists) barcode = null;
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
      barcode,
      bggId: force ? null : (bggDetails?.bggId ?? null),
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

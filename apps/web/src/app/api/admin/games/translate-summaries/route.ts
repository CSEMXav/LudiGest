import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { looksEnglish, translateToFrench } from "@/lib/translate";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

async function findEnglishGames() {
  const games = await prisma.game.findMany({
    where: { summary: { not: null } },
    select: { id: true, name: true, summary: true, location: true },
    orderBy: { name: "asc" },
  });
  return games.filter((g) => looksEnglish(g.summary));
}

/** GET → liste des jeux dont le résumé semble en anglais (aucune modification). */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const games = await findEnglishGames();
  return NextResponse.json({ count: games.length, games: games.map((g) => ({ id: g.id, name: g.name, location: g.location })) });
}

/**
 * POST { limit?: number } → traduit en français jusqu'à `limit` résumés anglais (10 par défaut)
 * et renvoie { translated: [{id,name}], failed: [{id,name}], remaining }.
 * L'appelant boucle tant que remaining > 0 (limite de durée des fonctions serverless).
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 25);

  const english = await findEnglishGames();
  const batch = english.slice(0, limit);
  const translated: { id: string; name: string }[] = [];
  const failed: { id: string; name: string }[] = [];

  for (const g of batch) {
    try {
      const fr = await translateToFrench(g.summary!);
      if (!fr || fr === g.summary || looksEnglish(fr)) { failed.push({ id: g.id, name: g.name }); continue; }
      await prisma.game.update({ where: { id: g.id }, data: { summary: fr } });
      translated.push({ id: g.id, name: g.name });
    } catch {
      failed.push({ id: g.id, name: g.name });
    }
  }

  // Les échecs restent "anglais" : on les retire du reste à faire pour éviter une boucle infinie côté client
  const remaining = Math.max(english.length - batch.length, 0);
  return NextResponse.json({ translated, failed, remaining });
}

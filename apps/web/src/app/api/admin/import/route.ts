import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseGameExcel } from "@/lib/excel";
import { searchBGG, getGameDetails } from "@/lib/bgg";
import { translateToFrench } from "@/lib/translate";
import type { ImportResult } from "@ludigest/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }
  if (!file.name.endsWith(".xlsx")) {
    return NextResponse.json({ error: "Seuls les fichiers .xlsx sont acceptés." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await parseGameExcel(buffer);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Le fichier ne contient aucune donnée." }, { status: 400 });
  }

  const result: ImportResult = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const existing = await prisma.game.findFirst({
        where: { name: { equals: row.name } },
      });
      if (existing) {
        result.skipped++;
        continue;
      }

      const bggResults = await searchBGG(row.name);
      await new Promise((r) => setTimeout(r, 500));

      let details = null;
      if (bggResults.length > 0) {
        details = await getGameDetails(bggResults[0].bggId);
        await new Promise((r) => setTimeout(r, 500));
      }

      const summaryFr = details?.summary ? await translateToFrench(details.summary) : null;

      await prisma.game.create({
        data: {
          name:       details?.name      ?? row.name,
          type:       details?.type      ?? "Jeu de société",
          category:   row.category,
          bggId:      details?.bggId     ?? bggResults[0]?.bggId ?? null,
          summary:    summaryFr,
          minAge:     details?.minAge    ?? null,
          minPlayers: details?.minPlayers ?? null,
          maxPlayers: details?.maxPlayers ?? null,
          duration:   details?.duration  ?? null,
          coverUrl:   details?.coverUrl  ?? null,
          barcode:    details?.barcode   ?? null,
        },
      });
      result.created++;
    } catch (err) {
      result.errors.push({
        name: row.name,
        reason: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  return NextResponse.json(result);
}

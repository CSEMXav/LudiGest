import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseGameExcel } from "@/lib/excel";
import { searchBGG, getGameDetails } from "@/lib/bgg";
import { translateToFrench } from "@/lib/translate";

function sseChunk(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return new Response(JSON.stringify({ error: "Aucun fichier fourni." }), { status: 400 });
  if (!file.name.endsWith(".xlsx")) return new Response(JSON.stringify({ error: "Seuls les fichiers .xlsx sont acceptés." }), { status: 400 });
  if (file.size > 10 * 1024 * 1024) return new Response(JSON.stringify({ error: "Fichier trop volumineux (max 10 Mo)." }), { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Awaited<ReturnType<typeof parseGameExcel>>;
  try {
    rows = await parseGameExcel(buffer);
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur de lecture du fichier." }), { status: 400 });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "Le fichier ne contient aucune donnée." }), { status: 400 });
  }

  const location = session.user.location;

  const stream = new ReadableStream({
    async start(controller) {
      let created = 0;
      let skipped = 0;
      const errors: { name: string; reason: string }[] = [];

      const send = (extra?: object) =>
        controller.enqueue(sseChunk({ created, skipped, errors, ...extra }));

      try {
        for (let i = 0; i < rows.length; i++) {
          if (req.signal.aborted) break;

          const row = rows[i];
          const progress = Math.round(((i + 1) / rows.length) * 100);

          try {
            // Vérifier si le jeu existe déjà (par bggId si fourni, sinon par nom)
            const existing = row.bggId
              ? await prisma.game.findFirst({ where: { OR: [{ bggId: row.bggId }, { name: { equals: row.name } }] } })
              : await prisma.game.findFirst({ where: { name: { equals: row.name } } });

            if (existing) {
              skipped++;
              send({ progress });
              continue;
            }

            let details = null;
            let bggIdToUse = row.bggId ?? null;

            if (bggIdToUse) {
              // BGG ID fourni directement → récupérer les détails sans chercher
              details = await getGameDetails(bggIdToUse);
              await new Promise((r) => setTimeout(r, 300));
            } else {
              // Recherche par nom
              const bggResults = await searchBGG(row.name);
              await new Promise((r) => setTimeout(r, 500));
              if (bggResults.length > 0) {
                bggIdToUse = bggResults[0].bggId;
                details = await getGameDetails(bggIdToUse);
                await new Promise((r) => setTimeout(r, 500));
              }
            }

            // Traduction du résumé si nécessaire
            const summaryFr = details?.summary ? await translateToFrench(details.summary) : null;

            // Le code barre du fichier prime sur celui de BGG
            const barcode = row.barcode ?? details?.barcode ?? null;

            await prisma.game.create({
              data: {
                name:       details?.name      ?? row.name,
                type:       details?.type      ?? "Jeu de société",
                category:   row.category,
                location,
                addedAt:    row.addedAt,
                bggId:      bggIdToUse,
                summary:    summaryFr,
                minAge:     details?.minAge    ?? null,
                minPlayers: details?.minPlayers ?? null,
                maxPlayers: details?.maxPlayers ?? null,
                duration:   details?.duration  ?? null,
                coverUrl:   details?.coverUrl  ?? null,
                barcode,
              },
            });
            created++;
          } catch (err) {
            errors.push({ name: row.name, reason: err instanceof Error ? err.message : "Erreur inconnue" });
          }

          send({ progress });
        }

        send({ progress: 100, done: true });
      } catch (err) {
        controller.enqueue(sseChunk({ error: err instanceof Error ? err.message : "Erreur inattendue", done: true }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

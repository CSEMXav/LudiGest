import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseGameExcel } from "@/lib/excel";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  if (!file.name.endsWith(".xlsx")) return NextResponse.json({ error: "Seuls les fichiers .xlsx sont acceptés." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: Awaited<ReturnType<typeof parseGameExcel>>;
  try {
    rows = await parseGameExcel(buffer);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur de lecture du fichier." }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Le fichier ne contient aucune donnée." }, { status: 400 });
  }

  const location = session.user.location;
  const duplicates: { name: string; existingName: string; existingId: string }[] = [];

  for (const row of rows) {
    const existing = row.bggId
      ? await prisma.game.findFirst({ where: { location, OR: [{ bggId: row.bggId }, { name: { equals: row.name } }] } })
      : await prisma.game.findFirst({ where: { location, name: { equals: row.name } } });

    if (existing) {
      duplicates.push({ name: row.name, existingName: existing.name, existingId: existing.id });
    }
  }

  return NextResponse.json({ total: rows.length, duplicates });
}

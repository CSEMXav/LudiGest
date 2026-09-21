import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { looksEnglish, translateToFrench } from "@/lib/translate";

/** POST { text } → { text, wasEnglish } : traduit un texte libre en français (sans l'enregistrer). */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "Texte vide." }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: "Texte trop long (5000 caractères max)." }, { status: 400 });

  const wasEnglish = looksEnglish(text);
  const translated = await translateToFrench(text);
  if (!translated || translated === text) {
    return NextResponse.json({ error: "Traduction indisponible pour le moment." }, { status: 502 });
  }
  return NextResponse.json({ text: translated, wasEnglish });
}

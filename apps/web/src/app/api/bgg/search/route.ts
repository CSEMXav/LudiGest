import { NextRequest, NextResponse } from "next/server";
import { searchBGG, getGameDetails } from "@/lib/bgg";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const withDetails = searchParams.get("details") === "true";
  const bggId = searchParams.get("bggId");

  if (bggId) {
    const details = await getGameDetails(bggId);
    return NextResponse.json(details ?? { error: "Introuvable" });
  }

  if (!query) {
    return NextResponse.json({ error: "Paramètre 'query' requis." }, { status: 400 });
  }

  const results = await searchBGG(query);

  if (withDetails && results.length > 0) {
    const details = await getGameDetails(results[0].bggId);
    return NextResponse.json({ results, details });
  }

  return NextResponse.json(results);
}

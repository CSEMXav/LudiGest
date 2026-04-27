import { parseStringPromise } from "xml2js";

const BGG_XML_BASE = "https://boardgamegeek.com/xmlapi2";
const GEEKDO_BASE  = "https://api.geekdo.com/api";
const BGG_HEADERS  = {
  "User-Agent": "LudiGest/1.0 (board game library manager)",
  "Accept": "application/json, application/xml, text/xml",
};

export interface BggSearchResult {
  bggId: string;
  name: string;
  yearPublished?: string;
}

export interface BggGameDetails {
  bggId: string;
  name: string;
  type: string;
  summary: string | null;
  minAge: number | null;
  coverUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  duration: number | null;
  barcode: string | null;
}

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = String(url).trim();
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http")) return s;
  return null;
}

function parseInt0(val: string | number | undefined): number | null {
  const n = typeof val === "number" ? val : parseInt(String(val ?? "0"));
  return isNaN(n) || n === 0 ? null : n;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchBGG(query: string): Promise<BggSearchResult[]> {
  // Try BGG XML API first (works in production, may be blocked by Cloudflare in dev)
  const xmlResults = await searchBGGXml(query);
  if (xmlResults.length > 0) return xmlResults;

  // Fallback: geekdo JSON API (same backend as details, bypasses Cloudflare)
  const geekdoResults = await searchBGGViaGeekdo(query);
  if (geekdoResults.length > 0) return geekdoResults;

  // Last resort: Wikidata SPARQL (covers popular games with P2339 property)
  return searchBGGViaWikidata(query);
}

async function searchBGGViaGeekdo(query: string): Promise<BggSearchResult[]> {
  try {
    const url = `${GEEKDO_BASE}/search?q=${encodeURIComponent(query)}&nosession=1`;
    const res = await fetch(url, { cache: "no-store", headers: BGG_HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    const items: any[] = data?.items ?? data?.results ?? [];
    return items
      .filter((item: any) => {
        const t = (item.type ?? item.objecttype ?? "").toLowerCase();
        return t === "boardgame" || t === "thing";
      })
      .slice(0, 10)
      .map((item: any) => ({
        bggId:         String(item.id ?? item.objectid ?? ""),
        name:          item.name ?? item.primaryName ?? "",
        yearPublished: item.yearpublished ? String(item.yearpublished) : undefined,
      }))
      .filter((r: BggSearchResult) => r.bggId && r.name);
  } catch {
    return [];
  }
}

async function searchBGGXml(query: string): Promise<BggSearchResult[]> {
  const url = `${BGG_XML_BASE}/search?query=${encodeURIComponent(query)}&type=boardgame`;
  try {
    const res = await fetch(url, { cache: "no-store", headers: BGG_HEADERS });
    if (!res.ok) return [];
    const xml  = await res.text();
    const data = await parseStringPromise(xml, { explicitArray: true });
    const items: any[] = data?.items?.item ?? [];
    return items.slice(0, 10).map((item: any) => ({
      bggId:         item.$.id,
      name:          item.name?.[0]?.$.value ?? "",
      yearPublished: item.yearpublished?.[0]?.$.value,
    }));
  } catch {
    return [];
  }
}

async function wikidataSparql(filter: string): Promise<BggSearchResult[]> {
  const sparql = `SELECT DISTINCT ?bggId ?itemLabel WHERE {
    ?item wdt:P2339 ?bggId.
    ?item rdfs:label ?itemLabel.
    FILTER(LANG(?itemLabel) = "en" || LANG(?itemLabel) = "fr")
    ${filter}
  } LIMIT 10`;
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}`, {
    cache: "no-store",
    headers: { "Accept": "application/json", "User-Agent": "LudiGest/1.0" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results?.bindings ?? [])
    .map((b: any) => ({ bggId: b.bggId?.value ?? "", name: b.itemLabel?.value ?? "" }))
    .filter((r: BggSearchResult) => r.bggId);
}

function dedup(results: BggSearchResult[]): BggSearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => { if (seen.has(r.bggId)) return false; seen.add(r.bggId); return true; });
}

async function searchBGGViaWikidata(query: string): Promise<BggSearchResult[]> {
  try {
    const q = query.toLowerCase().replace(/"/g, '\\"');

    // Strategy 1: exact label match (fastest)
    const exact = await wikidataSparql(`FILTER(LCASE(STR(?itemLabel)) = "${q}")`);
    if (exact.length > 0) return dedup(exact);

    // Strategy 2: full phrase contained in label
    const contains = await wikidataSparql(`FILTER(CONTAINS(LCASE(STR(?itemLabel)), "${q}"))`);
    if (contains.length > 0) {
      const queryLower = q;
      contains.sort((a, b) => (a.name.toLowerCase() === queryLower ? -1 : 1));
      return dedup(contains);
    }

    // Strategy 3: all significant words present (handles "Next Station: Paris" vs "Next Station Paris")
    const words = query.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 1) {
      const wordFilters = words.map((w) => `FILTER(CONTAINS(LCASE(STR(?itemLabel)), "${w.toLowerCase().replace(/"/g, '\\"')}"))`)
        .join("\n    ");
      const wordResults = await wikidataSparql(wordFilters);
      if (wordResults.length > 0) return dedup(wordResults);
    }

    return [];
  } catch {
    return [];
  }
}

async function lookupBarcodeFromUPC(gameName: string): Promise<string | null> {
  try {
    const url = `https://api.upcitemdb.com/prod/trial/search?s=${encodeURIComponent(gameName)}&type=product`;
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "LudiGest/1.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const items: any[] = data.items ?? [];

    const nameWords = gameName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const relevant = items.filter((i: any) => {
      const title = (i.title ?? "").toLowerCase();
      return nameWords.every((w) => title.includes(w));
    });
    const pool = relevant.length > 0 ? relevant : items;
    if (pool.length === 0) return null;

    // Préférer la version française : EAN commençant par 3 (préfixe GS1 France 300-379)
    const frenchItem = pool.find((i: any) => {
      const ean = String(i.ean ?? "").replace(/^0+/, "");
      const code = parseInt(ean.slice(0, 3));
      return code >= 300 && code <= 379;
    });

    const best = frenchItem ?? pool[0];
    const ean = String(best.ean ?? "").replace(/^0+/, "").trim();
    return ean.length >= 8 ? ean : null;
  } catch {
    return null;
  }
}

export async function getGameDetails(bggId: string): Promise<BggGameDetails | null> {
  // Try geekdo JSON API first (more reliable, no Cloudflare block)
  const details = await getGameDetailsFromGeekdo(bggId);
  if (details) {
    if (!details.barcode) {
      details.barcode = await lookupBarcodeFromUPC(details.name);
    }
    return details;
  }

  // Fallback: XML API v2
  const xmlDetails = await getGameDetailsFromXml(bggId);
  if (xmlDetails && !xmlDetails.barcode) {
    xmlDetails.barcode = await lookupBarcodeFromUPC(xmlDetails.name);
  }
  return xmlDetails;
}

async function getGameDetailsFromGeekdo(bggId: string): Promise<BggGameDetails | null> {
  try {
    const url = `${GEEKDO_BASE}/geekitems?objectid=${bggId}&objecttype=thing`;
    const res = await fetch(url, { cache: "no-store", headers: BGG_HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    const item = data?.item;
    if (!item) return null;

    const summary = item.description ? stripHtml(item.description).substring(0, 1500) : null;

    const coverUrl = toHttps(item["imageurl@2x"] ?? item.imageurl ?? item.topimageurl);

    const firstCategory = (item.links?.boardgamecategory as any[])?.[0]?.name ?? null;
    const type = firstCategory ?? item.label ?? "Jeu de société";

    // EAN/barcode: stored per version in the versions array
    const versions: any[] = item.versions ?? [];
    const barcode = versions
      .flatMap((v: any) => v.productcodes ?? v.barcode ?? [])
      .find((code: any) => {
        const c = String(code?.productcode ?? code ?? "").trim();
        return c.length >= 8;
      });
    const barcodeStr = barcode ? String(barcode?.productcode ?? barcode).trim() : null;

    return {
      bggId,
      name:       item.name ?? "",
      type,
      summary:    summary || null,
      minAge:     parseInt0(item.minage),
      minPlayers: parseInt0(item.minplayers),
      maxPlayers: parseInt0(item.maxplayers),
      duration:   parseInt0(item.maxplaytime ?? item.minplaytime),
      coverUrl,
      barcode:    barcodeStr,
    };
  } catch {
    return null;
  }
}

async function getGameDetailsFromXml(bggId: string): Promise<BggGameDetails | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = `${BGG_XML_BASE}/thing?id=${bggId}&stats=1&versions=1`;
      const res = await fetch(url, { cache: "no-store", headers: BGG_HEADERS });

      if (res.status === 202) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) return null;

      const xml  = await res.text();
      const data = await parseStringPromise(xml, { explicitArray: true });
      const item = data?.items?.item?.[0];
      if (!item) return null;

      const names: any[] = item.name ?? [];
      const primaryName  = names.find((n: any) => n.$.type === "primary")?.$.value ?? names[0]?.$.value ?? "";

      const rawDesc: string = item.description?.[0] ?? "";
      const summary = stripHtml(rawDesc).substring(0, 1500);

      const links: any[] = item.link ?? [];
      const bggCategories = links.filter((l: any) => l.$.type === "boardgamecategory").map((l: any) => l.$.value as string);
      const type = bggCategories[0] ?? "Jeu de société";

      const coverUrl = toHttps(item.image?.[0]) ?? toHttps(item.thumbnail?.[0]);

      // EAN from XML versions list
      const xmlVersions: any[] = item.versions?.[0]?.item ?? [];
      const xmlBarcode = xmlVersions
        .flatMap((v: any) => v.productcode ?? [])
        .map((p: any) => String(p?.$.value ?? "").trim())
        .find((c) => c.length >= 8) ?? null;

      return {
        bggId,
        name:       primaryName,
        type,
        summary:    summary || null,
        minAge:     parseInt0(item.minage?.[0]?.$.value),
        minPlayers: parseInt0(item.minplayers?.[0]?.$.value),
        maxPlayers: parseInt0(item.maxplayers?.[0]?.$.value),
        duration:   parseInt0(item.playingtime?.[0]?.$.value),
        coverUrl,
        barcode:    xmlBarcode,
      };
    } catch {
      return null;
    }
  }
  return null;
}

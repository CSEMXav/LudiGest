import { lookup } from "dns/promises";
import { isIP } from "net";
import { searchBGG, getGameDetails } from "@/lib/bgg";
import { ensureFrenchSummary } from "@/lib/translate";

export interface ProposalInfo {
  summary: string | null;
  coverUrl: string | null;
  bggId: string | null;
  minAge: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  duration: number | null;
}

const MAX_HTML_BYTES = 600_000;
const FETCH_TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;

/** Valide un lien saisi par un membre : http(s) uniquement, longueur raisonnable. */
export function normalizeLink(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || raw.length > 500) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("ff");
}

/** Le lien vient d'un utilisateur : on refuse tout hôte qui résout vers le réseau interne. */
async function isPublicUrl(url: URL): Promise<boolean> {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.port && url.port !== "80" && url.port !== "443") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

async function fetchPublicHtml(link: string): Promise<{ html: string; finalUrl: URL } | null> {
  let url = new URL(link);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicUrl(url))) return null;
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LudiGest/1.0)", "Accept": "text/html", "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return null;
      url = new URL(next, url);
      continue;
    }
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html") || !res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    // Certaines boutiques servent encore de l'ISO-8859-1 : on respecte l'encodage annoncé
    const bytes = Buffer.concat(chunks);
    const charset = (res.headers.get("content-type") ?? "").match(/charset=["']?([\w-]+)/i)?.[1]
      ?? bytes.subarray(0, 2048).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]
      ?? "utf-8";
    let html: string;
    try { html = new TextDecoder(charset).decode(bytes); } catch { html = bytes.toString("utf8"); }
    return { html, finalUrl: url };
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, keys: string[]): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (!key || !keys.includes(key)) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    if (content?.trim()) return decodeEntities(content);
  }
  return null;
}

interface GameSpecs {
  minAge: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  duration: number | null;
}
interface LinkMeta extends GameSpecs {
  summary: string | null;
  coverUrl: string | null;
}
const NO_META: LinkMeta = { summary: null, coverUrl: null, minAge: null, minPlayers: null, maxPlayers: null, duration: null };

function inRange(n: number, min: number, max: number): number | null {
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/**
 * Repère joueurs / durée / âge dans le texte d'une fiche produit française
 * ("2 à 4 joueurs", "Durée : 45 min", "À partir de 10 ans"…).
 */
export function extractSpecsFromText(text: string): GameSpecs {
  const t = text.replace(/\s+/g, " ");
  const specs: GameSpecs = { minAge: null, minPlayers: null, maxPlayers: null, duration: null };

  const range = t.match(/(\d{1,2})\s*(?:à|a|-|–|—|\/)\s*(\d{1,3})\s*joueurs?/i)
    ?? t.match(/joueurs?\s*:?\s*(?:de\s*)?(\d{1,2})\s*(?:à|a|-|–|—)\s*(\d{1,3})/i);
  if (range) {
    const min = inRange(Number(range[1]), 1, 99), max = inRange(Number(range[2]), 1, 999);
    if (min && max && min <= max) { specs.minPlayers = min; specs.maxPlayers = max; }
  }
  if (!specs.minPlayers) {
    const plus = t.match(/(\d{1,2})\s*joueurs?\s*(?:et\s*(?:plus|\+)|\+)/i) ?? t.match(/joueurs?\s*:?\s*(\d{1,2})\s*(?:et\s*plus|\+)/i);
    const single = t.match(/(?:nombre de joueurs?|joueurs?)\s*:\s*(\d{1,2})\b/i) ?? t.match(/\b(\d{1,2})\s*joueurs?\b/i);
    if (plus) specs.minPlayers = inRange(Number(plus[1]), 1, 99);
    else if (single) { specs.minPlayers = inRange(Number(single[1]), 1, 99); specs.maxPlayers = specs.minPlayers; }
  }

  const hours = t.match(/(?:durée|temps de jeu|partie)[^.\d]{0,40}(\d)\s*h\s*(\d{2})?/i);
  const minutes = t.match(/(?:durée|temps de jeu|partie)[^.\d]{0,40}(?:\d{1,3}\s*(?:à|-|–)\s*)?(\d{1,3})\s*(?:min|mn|minutes)\b/i)
    ?? t.match(/\b(?:\d{1,3}\s*(?:à|-|–)\s*)?(\d{1,3})\s*(?:min|mn|minutes)\b/i);
  if (minutes) specs.duration = inRange(Number(minutes[1]), 1, 999);
  else if (hours) specs.duration = inRange(Number(hours[1]) * 60 + Number(hours[2] ?? 0), 1, 999);

  const age = t.match(/(?:à partir de|dès|âge|age)\s*(?:minimum|conseillé|recommandé)?\s*:?\s*(?:à partir de|dès)?\s*(\d{1,2})\s*(?:ans|\+)/i)
    ?? t.match(/\b(\d{1,2})\s*ans\s*(?:et\s*(?:plus|\+)|\+)/i)
    ?? t.match(/\b(\d{1,2})\s*\+\s*ans\b/i);
  if (age) specs.minAge = inRange(Number(age[1]), 1, 21);

  return specs;
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

/** Image, description (balises OpenGraph / meta) et caractéristiques lues sur la page. */
async function fetchLinkMeta(link: string): Promise<LinkMeta> {
  try {
    const page = await fetchPublicHtml(link);
    if (!page) return NO_META;
    const head = page.html.slice(0, MAX_HTML_BYTES);
    const summary = metaContent(head, ["og:description", "description", "twitter:description"]);
    const image = metaContent(head, ["og:image", "og:image:secure_url", "twitter:image"]);
    let coverUrl: string | null = null;
    if (image) {
      try {
        const abs = new URL(image, page.finalUrl);
        if (abs.protocol === "https:" || abs.protocol === "http:") coverUrl = abs.toString();
      } catch { /* image illisible */ }
    }
    return { summary: summary ? summary.slice(0, 1500) : null, coverUrl, ...extractSpecsFromText(htmlToText(page.html)) };
  } catch {
    return NO_META;
  }
}

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Ne retient un résultat BGG que si son nom correspond vraiment au titre saisi (évite les infos d'un autre jeu). */
function pickBggMatch(title: string, results: { bggId: string; name: string }[]): string | undefined {
  const wanted = normalizeName(title);
  if (!wanted) return undefined;
  const exact = results.find((r) => normalizeName(r.name) === wanted);
  if (exact) return exact.bggId;
  if (wanted.length < 4) return undefined;
  return results.find((r) => {
    const name = normalizeName(r.name);
    return name.startsWith(wanted + " ") || wanted.startsWith(name + " ");
  })?.bggId;
}

/**
 * Tente de récupérer des infos sur un jeu proposé : d'abord la page du lien
 * (fiche BGG ou balises meta d'une boutique), puis BoardGameGeek par le nom.
 * Ne lève jamais : renvoie ce qui a pu être trouvé.
 */
export async function fetchProposalInfo(title: string, link: string | null): Promise<ProposalInfo> {
  const info: ProposalInfo = { summary: null, coverUrl: null, bggId: null, minAge: null, minPlayers: null, maxPlayers: null, duration: null };

  const bggIdFromLink = link?.match(/boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)/)?.[1] ?? null;

  const [meta, bgg] = await Promise.all([
    link && !bggIdFromLink ? fetchLinkMeta(link) : Promise.resolve(NO_META),
    (async () => {
      try {
        const bggId = bggIdFromLink ?? pickBggMatch(title, await searchBGG(title));
        return bggId ? await getGameDetails(bggId, { skipBarcodeLookup: true }) : null;
      } catch {
        return null;
      }
    })(),
  ]);

  // Joueurs / durée / âge : BoardGameGeek (données structurées) d'abord, sinon ce qui est lu sur la page du lien
  info.bggId = bgg?.bggId ?? null;
  info.minAge = bgg?.minAge ?? meta.minAge;
  info.duration = bgg?.duration ?? meta.duration;
  if (bgg?.minPlayers) {
    info.minPlayers = bgg.minPlayers;
    info.maxPlayers = bgg.maxPlayers;
  } else {
    info.minPlayers = meta.minPlayers;
    info.maxPlayers = meta.maxPlayers;
  }
  // La page du lien (souvent en français, bonne édition) prime sur BGG pour le texte et l'image
  info.coverUrl = meta.coverUrl ?? bgg?.coverUrl ?? null;
  info.summary = await ensureFrenchSummary(meta.summary ?? bgg?.summary ?? null).catch(() => meta.summary ?? bgg?.summary ?? null);
  return info;
}

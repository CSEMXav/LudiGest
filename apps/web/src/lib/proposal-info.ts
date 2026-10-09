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

  // Toutes les mentions candidates, avec leur position dans la page
  const players: { pos: number; min: number; max: number | null }[] = [];
  for (const m of Array.from(t.matchAll(/(\d{1,2})\s*(?:à|a|-|–|—|\/)\s*(\d{1,3})\s*joueurs?|joueurs?\s*:?\s*(?:de\s*)?(\d{1,2})\s*(?:à|a|-|–|—)\s*(\d{1,3})/gi))) {
    const min = inRange(Number(m[1] ?? m[3]), 1, 99), max = inRange(Number(m[2] ?? m[4]), 1, 999);
    if (min && max && min <= max) players.push({ pos: m.index, min, max });
  }
  for (const m of Array.from(t.matchAll(/\b(\d{1,2})\s*joueurs?\s*(?:et\s*(?:plus|\+)|\+)|joueurs?\s*:?\s*(\d{1,2})\s*(?:et\s*plus|\+)/gi))) {
    const min = inRange(Number(m[1] ?? m[2]), 1, 99);
    if (min) players.push({ pos: m.index, min, max: null });
  }
  if (players.length === 0) {
    for (const m of Array.from(t.matchAll(/(?:nombre de joueurs?|joueurs?)\s*:\s*(\d{1,2})\b|\b(\d{1,2})\s*joueurs?\b/gi))) {
      const n = inRange(Number(m[1] ?? m[2]), 1, 99);
      if (n) players.push({ pos: m.index, min: n, max: n });
    }
  }

  const durations: { pos: number; value: number }[] = [];
  for (const m of Array.from(t.matchAll(/\b(?:\d{1,3}\s*(?:à|-|–)\s*)?(\d{1,3})\s*(?:min|mn|minutes)\b/gi))) {
    const v = inRange(Number(m[1]), 1, 999);
    if (v) durations.push({ pos: m.index, value: v });
  }
  for (const m of Array.from(t.matchAll(/\b(\d)\s*h(?:\s*(\d{2}))?\b/gi))) {
    const v = inRange(Number(m[1]) * 60 + Number(m[2] ?? 0), 1, 999);
    if (v) durations.push({ pos: m.index, value: v });
  }

  let ages: { pos: number; value: number }[] = [];
  for (const m of Array.from(t.matchAll(/(?:à partir de|dès|[âa]ge\s*(?:minimum|conseillé|recommandé)?\s*:?)\s*(\d{1,2})\s*(?:ans|\+)|\b(\d{1,2})\s*ans\s*(?:et\s*(?:plus|\+)|\+)|\b(\d{1,2})\s*\+(?!\s*\d)/gi))) {
    const v = inRange(Number(m[1] ?? m[2] ?? m[3]), 1, 21);
    // "ne convient pas aux enfants de moins de 3 ans" n'est pas un âge conseillé
    if (v && !/moins de\s*$/i.test(t.slice(Math.max(0, m.index - 12), m.index))) ages.push({ pos: m.index, value: v });
  }
  // Les menus de boutique listent "à partir de 1 an, 2 ans, 3 ans…" : on écarte ces énumérations
  ages = ages.filter((a) => !ages.some((b) => b !== a && b.value !== a.value && Math.abs(b.pos - a.pos) < 60));

  // La fiche du jeu regroupe joueurs / durée / âge : on retient le groupe le plus complet et le plus serré
  const NEAR = 300;
  const nearest = <T extends { pos: number }>(list: T[], pos: number): T | undefined =>
    list.filter((x) => Math.abs(x.pos - pos) <= NEAR).sort((a, b) => Math.abs(a.pos - pos) - Math.abs(b.pos - pos))[0];

  let best: { count: number; span: number; specs: GameSpecs } | null = null;
  for (const p of players) {
    const age = nearest(ages, p.pos);
    const dur = nearest(durations, p.pos);
    const count = 1 + (age ? 1 : 0) + (dur ? 1 : 0);
    const span = Math.max(age ? Math.abs(age.pos - p.pos) : 0, dur ? Math.abs(dur.pos - p.pos) : 0);
    if (!best || count > best.count || (count === best.count && span < best.span)) {
      best = { count, span, specs: { minPlayers: p.min, maxPlayers: p.max, minAge: age?.value ?? null, duration: dur?.value ?? null } };
    }
  }
  if (best) return best.specs;

  // Pas de nombre de joueurs sur la page : on n'accepte que des mentions explicites
  const explicitAge = ages.find((a) => /^(?:à partir de|dès|[âa]ge)/i.test(t.slice(a.pos, a.pos + 12)));
  const explicitDuration = durations.find((d) => /(?:durée|temps de jeu|partie)[^.]{0,40}$/i.test(t.slice(Math.max(0, d.pos - 50), d.pos)));
  return { minPlayers: null, maxPlayers: null, minAge: explicitAge?.value ?? null, duration: explicitDuration?.value ?? null };
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

  // Joueurs / durée / âge : la fiche du lien (édition réellement proposée) d'abord, sinon BoardGameGeek
  info.bggId = bgg?.bggId ?? null;
  info.minAge = meta.minAge ?? bgg?.minAge ?? null;
  info.duration = meta.duration ?? bgg?.duration ?? null;
  if (meta.minPlayers) {
    info.minPlayers = meta.minPlayers;
    info.maxPlayers = meta.maxPlayers;
  } else {
    info.minPlayers = bgg?.minPlayers ?? null;
    info.maxPlayers = bgg?.maxPlayers ?? null;
  }
  // La page du lien (souvent en français, bonne édition) prime sur BGG pour le texte et l'image
  info.coverUrl = meta.coverUrl ?? bgg?.coverUrl ?? null;
  info.summary = await ensureFrenchSummary(meta.summary ?? bgg?.summary ?? null).catch(() => meta.summary ?? bgg?.summary ?? null);
  return info;
}

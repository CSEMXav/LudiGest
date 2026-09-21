export async function translateToFrench(text: string): Promise<string> {
  if (!text || text.length < 10) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return text;
    const data = await res.json();
    const translated = (data[0] as any[]).map((s: any) => s[0] ?? "").join("");
    return translated.trim() || text;
  } catch {
    return text;
  }
}

const EN_WORDS = new Set(["the", "and", "with", "of", "you", "your", "players", "player", "game", "is", "are", "each", "their", "from", "will", "this", "that", "to", "for", "it", "by", "have", "has", "can", "cards", "card", "points", "who", "which", "when", "they", "be", "into", "or", "but", "most", "more", "one", "all", "other", "as", "at"]);
const FR_WORDS = new Set(["le", "la", "les", "des", "et", "vous", "joueurs", "joueur", "jeu", "est", "une", "un", "du", "dans", "pour", "sur", "avec", "qui", "que", "chaque", "leur", "leurs", "ce", "cette", "au", "aux", "en", "ne", "pas", "cartes", "carte", "points", "sont", "ont", "plus", "mais", "ou", "où", "tous", "toutes", "votre", "vos", "ses", "son", "sa", "se", "être", "avoir", "fin", "partie"]);

/**
 * Heuristique simple : le texte ressemble-t-il à de l'anglais ?
 * Compare la fréquence de mots-outils anglais vs français.
 */
export function looksEnglish(text: string | null | undefined): boolean {
  if (!text) return false;
  const words = text.toLowerCase().match(/[a-zà-ÿ']+/g) ?? [];
  if (words.length < 6) return false;
  let en = 0, fr = 0;
  for (const w of words) {
    if (EN_WORDS.has(w)) en++;
    if (FR_WORDS.has(w)) fr++;
  }
  return en >= 3 && en > fr * 1.5;
}

/** Traduit le résumé uniquement s'il ressemble à de l'anglais ; sinon le renvoie tel quel. */
export async function ensureFrenchSummary(text: string | null | undefined): Promise<string | null> {
  if (!text) return null;
  if (!looksEnglish(text)) return text;
  const translated = await translateToFrench(text);
  return translated || text;
}

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

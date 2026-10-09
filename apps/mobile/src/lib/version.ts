import Constants from "expo-constants";

/** Version de l'application (même numéro « v1.xx » que le site). À incrémenter à chaque livraison. */
export const APP_VERSION = "1.35";

const SITE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://www.ludigest.fr";

/** Page du site où télécharger la dernière version de l'application. */
export const DOWNLOAD_URL = `${SITE_URL}/download`;

export interface UpdateInfo {
  current: string;
  /** Version de l'APK publié sur le site, ou null si elle n'a pas pu être lue. */
  latest: string | null;
  updateAvailable: boolean;
}

/** Compare deux versions "1.33" / "1.4" partie par partie. */
function isNewer(candidate: string, current: string): boolean {
  const a = candidate.split(".").map((n) => parseInt(n, 10) || 0);
  const b = current.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** Lit la version publiée sur le site (fichier app-version.json, mis à jour avec l'APK). */
export async function checkForUpdate(): Promise<UpdateInfo> {
  try {
    const res = await fetch(`${SITE_URL}/app-version.json?t=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error("indisponible");
    const data = await res.json();
    const latest = typeof data?.version === "string" && /^\d+(\.\d+)*$/.test(data.version) ? data.version : null;
    return { current: APP_VERSION, latest, updateAvailable: !!latest && isNewer(latest, APP_VERSION) };
  } catch {
    return { current: APP_VERSION, latest: null, updateAvailable: false };
  }
}

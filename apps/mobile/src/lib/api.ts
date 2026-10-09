import Constants from "expo-constants";
import { router } from "expo-router";
import { getToken, getStoredUser, saveToken, updateStoredUser, clearAuth } from "./auth";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3000";

let refreshInFlight: Promise<"ok" | "expired" | "offline"> | null = null;

/**
 * Renouvelle le jeton de connexion sans redemander le mot de passe.
 * "expired" : le serveur refuse la session ; "offline" : serveur injoignable (on garde le jeton actuel).
 */
export function refreshSession(): Promise<"ok" | "expired" | "offline"> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const token = await getToken();
      if (!token) return "expired" as const;
      try {
        const res = await fetch(`${BASE_URL}/api/auth/mobile-token/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) return "expired" as const;
        if (!res.ok) return "offline" as const;
        const data = await res.json();
        if (!data?.token) return "offline" as const;
        await saveToken(data.token);
        if (data.user && (await getStoredUser())) {
          await updateStoredUser({ name: data.user.name, role: data.user.role, email: data.user.email });
        }
        return "ok" as const;
      } catch {
        return "offline" as const;
      }
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/** Session définitivement refusée : on efface la connexion et on renvoie vers l'écran de connexion. */
async function endSession() {
  await clearAuth();
  try { router.replace("/(auth)/login"); } catch { /* navigation pas encore prête */ }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const send = async () => {
    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return { res: await fetch(`${BASE_URL}${path}`, { ...options, headers }), hadToken: !!token };
  };

  const first = await send();
  if (first.res.status !== 401 || !first.hadToken) return first.res;

  // Jeton expiré : on le renouvelle une fois puis on rejoue la requête,
  // au lieu de laisser les écrans se vider en silence.
  const outcome = await refreshSession();
  if (outcome === "ok") {
    const second = await send();
    if (second.res.status === 401) await endSession();
    return second.res;
  }
  if (outcome === "expired") await endSession();
  return first.res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((data.error as string) ?? "Erreur réseau");
  }
  return res.json();
}

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
  get canForce() { return !!this.data.canForce; }
  get duplicate() { return this.data.duplicate as { id: string; name: string } | undefined; }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? "Erreur réseau", res.status, data);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((data.error as string) ?? "Erreur réseau");
  }
  return res.json();
}

/** Utilitaires côté serveur pour la date limite d'inscription aux sessions. */

const PARIS = "Europe/Paris";

/** Décalage (minutes) de Europe/Paris par rapport à UTC à un instant donné. */
function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: PARIS, timeZoneName: "longOffset" }).formatToParts(at);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const m = tz.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2]) * 60 + parseInt(m[3] ?? "0"));
}

/** Convertit une date "YYYY-MM-DD" + heure "HH:MM" exprimées en heure de Paris en instant UTC. */
export function parisLocalToUtc(dateStr: string, timeStr: string): Date {
  const naive = new Date(`${dateStr}T${timeStr || "00:00"}:00Z`);
  const offset = parisOffsetMinutes(naive);
  return new Date(naive.getTime() - offset * 60_000);
}

/** Début effectif de la session (date + heure de début, heure de Paris). */
export function sessionStartUtc(s: { date: Date; startTime: string }): Date {
  return parisLocalToUtc(s.date.toISOString().slice(0, 10), s.startTime);
}

/** Date limite effective : la limite renseignée, sinon le début de la session. */
export function effectiveDeadline(s: { date: Date; startTime: string; registrationDeadline: Date | null }): Date {
  return s.registrationDeadline ?? sessionStartUtc(s);
}

export function isRegistrationClosed(s: { date: Date; startTime: string; registrationDeadline: Date | null }, now = new Date()): boolean {
  return now.getTime() > effectiveDeadline(s).getTime();
}

/**
 * Lit une valeur de date limite envoyée par un client.
 * - undefined  → champ absent (ne pas modifier)
 * - null / ""  → effacer
 * - string ISO → Date (ou erreur si invalide)
 */
export function parseDeadlineInput(value: unknown): { ok: true; value: Date | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: "Date limite d'inscription invalide." };
  const d = new Date(value);
  if (isNaN(d.getTime())) return { ok: false, error: "Date limite d'inscription invalide." };
  return { ok: true, value: d };
}

/** "vendredi 3 octobre 2026 à 18:00" (heure de Paris). */
export function formatDeadlineFr(d: Date): string {
  const date = d.toLocaleDateString("fr-FR", { timeZone: PARIS, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { timeZone: PARIS, hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { parisLocalToUtc } from "@/lib/session-utils";
import { getProposalWindow, type ProposalWindow } from "@/lib/proposals";

const LOCAL_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

/** Instant UTC → "YYYY-MM-DDTHH:MM" en heure de Paris (format des champs datetime-local). */
function toParisLocal(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).slice(0, 16).replace(" ", "T");
}

function toDTO(w: ProposalWindow) {
  return {
    opensAt: w.opensAt?.toISOString() ?? null,
    closesAt: w.closesAt?.toISOString() ?? null,
    opensAtLocal: toParisLocal(w.opensAt),
    closesAtLocal: toParisLocal(w.closesAt),
    isOpen: w.isOpen,
  };
}

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

/** GET /api/proposals/settings — période d'ouverture de la page aux membres (ludothèque courante). */
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  return NextResponse.json(toDTO(await getProposalWindow(user.location)));
}

/**
 * PATCH /api/proposals/settings — admin : { opensAt, closesAt }
 * au format "YYYY-MM-DDTHH:MM" (heure de Paris) ou null pour effacer.
 */
export async function PATCH(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parse = (v: unknown): Date | null | undefined => {
    if (v === null || v === "") return null;
    const m = typeof v === "string" ? v.match(LOCAL_RE) : null;
    if (!m) return undefined;
    const d = parisLocalToUtc(m[1], m[2]);
    return isNaN(d.getTime()) ? undefined : d;
  };
  const opensAt = parse(body.opensAt);
  const closesAt = parse(body.closesAt);
  if (opensAt === undefined || closesAt === undefined) {
    return NextResponse.json({ error: "Date ou heure invalide." }, { status: 400 });
  }
  if (closesAt && !opensAt) {
    return NextResponse.json({ error: "Indiquez une date d'ouverture avant la date de fermeture." }, { status: 400 });
  }
  if (opensAt && closesAt && closesAt <= opensAt) {
    return NextResponse.json({ error: "La fermeture doit être postérieure à l'ouverture." }, { status: 400 });
  }

  await prisma.proposalSettings.upsert({
    where: { location: user.location },
    update: { opensAt, closesAt },
    create: { location: user.location, opensAt, closesAt },
  });
  return NextResponse.json(toDTO(await getProposalWindow(user.location)));
}

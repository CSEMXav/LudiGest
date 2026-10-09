import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { fetchProposalInfo, normalizeLink } from "@/lib/proposal-info";
import { PROPOSAL_CATEGORIES, PROPOSALS_CLOSED_ERROR, canAccessProposals, getLibraryMatcher, loadProposalDTO, toProposalDTO } from "@/lib/proposals";

// La récupération des infos (page du lien + BoardGameGeek) peut prendre quelques secondes
export const maxDuration = 30;

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

/** GET /api/proposals — propositions d'achat de la ludothèque courante. */
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await canAccessProposals(user))) return NextResponse.json({ error: PROPOSALS_CLOSED_ERROR }, { status: 403 });

  const proposals = await prisma.gameProposal.findMany({
    where: { location: user.location, archiveId: null },
    include: { user: { select: { name: true } }, votes: { select: { userId: true, value: true } } },
    orderBy: { createdAt: "desc" },
  });

  const inLibrary = await getLibraryMatcher(user.location);
  return NextResponse.json(proposals.map((p) => toProposalDTO(p, user, inLibrary)));
}

/** POST /api/proposals — tout membre peut proposer un jeu : { title, category, link? } */
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await canAccessProposals(user))) return NextResponse.json({ error: PROPOSALS_CLOSED_ERROR }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const rawLink = typeof body.link === "string" ? body.link.trim() : "";

  if (!title || title.length > 120) {
    return NextResponse.json({ error: "Titre requis (120 caractères maximum)." }, { status: 400 });
  }
  if (!PROPOSAL_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  }
  const link = rawLink ? normalizeLink(rawLink) : null;
  if (rawLink && !link) {
    return NextResponse.json({ error: "Lien invalide (adresse http ou https attendue)." }, { status: 400 });
  }

  const duplicate = await prisma.gameProposal.findFirst({
    where: { location: user.location, archiveId: null, title: { equals: title, mode: "insensitive" } },
  });
  if (duplicate) {
    return NextResponse.json({ error: "Ce jeu a déjà été proposé — vous pouvez voter pour lui dans la liste." }, { status: 409 });
  }

  const info = await fetchProposalInfo(title, link);

  const created = await prisma.gameProposal.create({
    data: { title, category, link, location: user.location, userId: user.id, ...info },
  });
  const proposal = await loadProposalDTO(created.id, user);

  return NextResponse.json(
    { ...proposal!, infoFound: !!(info.summary || info.coverUrl || info.minPlayers) },
    { status: 201 }
  );
}

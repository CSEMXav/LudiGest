import { prisma } from "@/lib/prisma";

export const PROPOSAL_CATEGORIES = ["escape", "famille", "ambiance", "enfant", "initié", "expert"];

type ProposalRow = NonNullable<Awaited<ReturnType<typeof loadProposal>>>;

export function loadProposal(id: string) {
  return prisma.gameProposal.findUnique({
    where: { id },
    include: { user: { select: { name: true } }, votes: { select: { userId: true, value: true } } },
  });
}

export type LibraryMatch = { id: string; name: string };
export type LibraryMatcher = (p: { title: string; bggId: string | null }) => LibraryMatch | null;

function normalizeTitle(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Repère les propositions qui correspondent à un jeu déjà présent dans la ludothèque :
 * même fiche BoardGameGeek, ou même nom (sans tenir compte de la casse, des accents et de la ponctuation).
 */
export async function getLibraryMatcher(location: string): Promise<LibraryMatcher> {
  const games = await prisma.game.findMany({ where: { location }, select: { id: true, name: true, bggId: true } });
  const byName = new Map<string, LibraryMatch>();
  const byBgg = new Map<string, LibraryMatch>();
  for (const g of games) {
    const match = { id: g.id, name: g.name };
    const key = normalizeTitle(g.name);
    if (key && !byName.has(key)) byName.set(key, match);
    if (g.bggId && !byBgg.has(g.bggId)) byBgg.set(g.bggId, match);
  }
  return (p) => byName.get(normalizeTitle(p.title)) ?? (p.bggId ? byBgg.get(p.bggId) : undefined) ?? null;
}

/** Charge une proposition et la met en forme pour l'utilisateur (avec le repérage "déjà à la ludothèque"). */
export async function loadProposalDTO(id: string, viewer: { id: string; role: string }) {
  const p = await loadProposal(id);
  if (!p) return null;
  return toProposalDTO(p, viewer, await getLibraryMatcher(p.location));
}

export function toProposalDTO(p: ProposalRow, viewer: { id: string; role: string }, inLibrary?: LibraryMatcher) {
  return {
    inLibrary: inLibrary ? inLibrary(p) : null,
    id: p.id,
    title: p.title,
    category: p.category,
    link: p.link,
    summary: p.summary,
    coverUrl: p.coverUrl,
    minAge: p.minAge,
    minPlayers: p.minPlayers,
    maxPlayers: p.maxPlayers,
    duration: p.duration,
    proposedBy: p.user.name,
    createdAt: p.createdAt.toISOString(),
    upVotes: p.votes.filter((v) => v.value > 0).length,
    downVotes: p.votes.filter((v) => v.value < 0).length,
    myVote: p.votes.find((v) => v.userId === viewer.id)?.value ?? 0,
    canDelete: viewer.role === "ADMIN" || p.userId === viewer.id,
  };
}

export interface ProposalWindow {
  opensAt: Date | null;
  closesAt: Date | null;
  /** La page est visible des membres : ouverture atteinte et fermeture pas encore atteinte. */
  isOpen: boolean;
}

/** Période d'ouverture de la page "Futurs achats" aux membres, par ludothèque. */
export async function getProposalWindow(location: string, now = new Date()): Promise<ProposalWindow> {
  const row = await prisma.proposalSettings.findUnique({ where: { location } }).catch(() => null);
  const opensAt = row?.opensAt ?? null;
  const closesAt = row?.closesAt ?? null;
  return { opensAt, closesAt, isOpen: !!opensAt && now >= opensAt && (!closesAt || now < closesAt) };
}

/** Les admins y ont toujours accès ; les membres uniquement pendant la période d'ouverture. */
export async function canAccessProposals(user: { role: string; location: string }): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  return (await getProposalWindow(user.location)).isOpen;
}

export const PROPOSALS_CLOSED_ERROR = "Les propositions d'achat ne sont pas ouvertes actuellement.";

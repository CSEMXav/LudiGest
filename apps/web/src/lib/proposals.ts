import { prisma } from "@/lib/prisma";

export const PROPOSAL_CATEGORIES = ["escape", "famille", "ambiance", "enfant", "initié", "expert"];

type ProposalRow = NonNullable<Awaited<ReturnType<typeof loadProposal>>>;

export function loadProposal(id: string) {
  return prisma.gameProposal.findUnique({
    where: { id },
    include: { user: { select: { name: true } }, votes: { select: { userId: true, value: true } } },
  });
}

export function toProposalDTO(p: ProposalRow, viewer: { id: string; role: string }) {
  return {
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

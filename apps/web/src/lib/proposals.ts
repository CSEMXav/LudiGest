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

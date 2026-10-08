import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { loadProposal, toProposalDTO } from "@/lib/proposals";

/** POST /api/proposals/[id]/vote — { value: 1 | -1 | 0 } (0 retire le vote). Un vote par membre. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? (await verifyMobileToken(req));
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { value } = await req.json().catch(() => ({}));
  if (value !== 1 && value !== -1 && value !== 0) {
    return NextResponse.json({ error: "Vote invalide." }, { status: 400 });
  }

  const exists = await prisma.gameProposal.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });

  const key = { proposalId_userId: { proposalId: params.id, userId: user.id } };
  if (value === 0) {
    await prisma.gameProposalVote.deleteMany({ where: { proposalId: params.id, userId: user.id } });
  } else {
    await prisma.gameProposalVote.upsert({
      where: key,
      update: { value },
      create: { proposalId: params.id, userId: user.id, value },
    });
  }

  const proposal = await loadProposal(params.id);
  return NextResponse.json(toProposalDTO(proposal!, user));
}

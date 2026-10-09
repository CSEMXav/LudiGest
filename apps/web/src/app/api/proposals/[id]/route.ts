import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { PROPOSALS_CLOSED_ERROR, canAccessProposals } from "@/lib/proposals";

/** DELETE /api/proposals/[id] — par l'auteur de la proposition ou un admin. */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? (await verifyMobileToken(req));
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await canAccessProposals(user))) return NextResponse.json({ error: PROPOSALS_CLOSED_ERROR }, { status: 403 });

  const proposal = await prisma.gameProposal.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!proposal) return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
  if (user.role !== "ADMIN" && proposal.userId !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.gameProposal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

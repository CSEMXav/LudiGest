import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { fetchProposalInfo } from "@/lib/proposal-info";
import { PROPOSALS_CLOSED_ERROR, canAccessProposals, loadProposalDTO } from "@/lib/proposals";

export const maxDuration = 30;

/** POST /api/proposals/[id]/refresh — relance la recherche d'infos (auteur ou admin). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user ?? (await verifyMobileToken(req));
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await canAccessProposals(user))) return NextResponse.json({ error: PROPOSALS_CLOSED_ERROR }, { status: 403 });

  const current = await prisma.gameProposal.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
  if (user.role !== "ADMIN" && current.userId !== user.id) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const info = await fetchProposalInfo(current.title, current.link);
  // On ne remplace une info existante que si la nouvelle recherche a trouvé quelque chose
  await prisma.gameProposal.update({
    where: { id: params.id },
    data: {
      summary: info.summary ?? current.summary,
      coverUrl: info.coverUrl ?? current.coverUrl,
      bggId: info.bggId ?? current.bggId,
      minAge: info.minAge ?? current.minAge,
      minPlayers: info.minPlayers ?? current.minPlayers,
      maxPlayers: info.minPlayers ? info.maxPlayers : current.maxPlayers,
      duration: info.duration ?? current.duration,
    },
  });

  return NextResponse.json(await loadProposalDTO(params.id, user));
}

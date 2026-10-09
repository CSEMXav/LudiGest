import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLibraryMatcher, toProposalDTO } from "@/lib/proposals";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

/** GET /api/proposals/archive — admin : sessions archivées de la ludothèque courante, avec leurs propositions et votes. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const archives = await prisma.proposalArchive.findMany({
    where: { location: admin.location },
    orderBy: { archivedAt: "desc" },
    include: {
      proposals: { include: { user: { select: { name: true } }, votes: { select: { userId: true, value: true } } } },
    },
  });
  const inLibrary = await getLibraryMatcher(admin.location);

  return NextResponse.json(archives.map((a) => ({
    id: a.id,
    name: a.name,
    archivedAt: a.archivedAt.toISOString(),
    opensAt: a.opensAt?.toISOString() ?? null,
    closesAt: a.closesAt?.toISOString() ?? null,
    proposals: a.proposals
      .map((p) => toProposalDTO(p, admin, inLibrary))
      .sort((x, y) => (y.upVotes - y.downVotes) - (x.upVotes - x.downVotes) || y.upVotes - x.upVotes),
  })));
}

/**
 * POST /api/proposals/archive — admin : { name? }
 * Archive toutes les propositions en cours de la ludothèque (avec leurs votes) et remet la page à zéro :
 * liste vide et période d'ouverture effacée, prête pour une future session.
 */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const name = (typeof body.name === "string" ? body.name.trim().slice(0, 80) : "") || `Session archivée le ${today}`;

  const count = await prisma.gameProposal.count({ where: { location: admin.location, archiveId: null } });
  if (count === 0) return NextResponse.json({ error: "Aucune proposition à archiver." }, { status: 400 });

  const settings = await prisma.proposalSettings.findUnique({ where: { location: admin.location } });

  const archive = await prisma.$transaction(async (tx) => {
    const created = await tx.proposalArchive.create({
      data: { name, location: admin.location, opensAt: settings?.opensAt ?? null, closesAt: settings?.closesAt ?? null },
    });
    await tx.gameProposal.updateMany({ where: { location: admin.location, archiveId: null }, data: { archiveId: created.id } });
    if (settings) {
      await tx.proposalSettings.update({ where: { location: admin.location }, data: { opensAt: null, closesAt: null } });
    }
    return created;
  });

  return NextResponse.json({ success: true, id: archive.id, name: archive.name, archived: count }, { status: 201 });
}

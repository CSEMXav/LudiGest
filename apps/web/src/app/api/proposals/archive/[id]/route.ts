import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/proposals/archive/[id] — admin : supprime définitivement une archive, ses propositions et leurs votes. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user;
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const archive = await prisma.proposalArchive.findUnique({ where: { id: params.id }, select: { location: true } });
  if (!archive || archive.location !== admin.location) {
    return NextResponse.json({ error: "Archive introuvable." }, { status: 404 });
  }

  await prisma.proposalArchive.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

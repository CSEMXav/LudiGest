import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const loan = await prisma.loan.findUnique({ where: { id: params.id } });
  if (!loan) return NextResponse.json({ error: "Emprunt introuvable." }, { status: 404 });
  if (loan.returnedAt) return NextResponse.json({ error: "Déjà rendu." }, { status: 409 });

  await prisma.$transaction([
    prisma.loan.update({ where: { id: params.id }, data: { returnedAt: new Date() } }),
    prisma.game.update({ where: { id: loan.gameId }, data: { status: "AVAILABLE" } }),
  ]);

  return NextResponse.json({ success: true });
}

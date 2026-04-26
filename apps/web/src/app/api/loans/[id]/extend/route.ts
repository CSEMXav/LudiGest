import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

async function getUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user) return session.user;
  return verifyMobileToken(req);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const loan = await prisma.loan.findUnique({ where: { id: params.id } });
  if (!loan) return NextResponse.json({ error: "Emprunt introuvable." }, { status: 404 });
  if (loan.userId !== user.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (loan.returnedAt) {
    return NextResponse.json({ error: "Ce jeu a déjà été rendu." }, { status: 409 });
  }
  if (loan.extendedCount >= 3) {
    return NextResponse.json({ error: "Vous avez atteint le maximum de 3 prolongations." }, { status: 409 });
  }

  const newDueAt = new Date(loan.dueAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const updated = await prisma.loan.update({
    where: { id: params.id },
    data: { dueAt: newDueAt, extendedCount: loan.extendedCount + 1 },
  });

  return NextResponse.json({ success: true, dueAt: updated.dueAt.toISOString(), extendedCount: updated.extendedCount });
}

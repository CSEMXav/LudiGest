import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (!user.suspended) return NextResponse.json({ error: "Seuls les comptes suspendus peuvent être supprimés." }, { status: 400 });

  await prisma.notification.deleteMany({ where: { userId: params.id } });
  await prisma.rating.deleteMany({ where: { userId: params.id } });
  await prisma.loan.deleteMany({ where: { userId: params.id } });
  await prisma.sessionRegistration.deleteMany({ where: { userId: params.id } });
  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json();
  const { role, suspended, emailVerified } = body;

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (suspended !== undefined) data.suspended = suspended;
  if (emailVerified !== undefined) data.emailVerified = emailVerified;

  const user = await prisma.user.update({ where: { id: params.id }, data });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    suspended: user.suspended,
  });
}

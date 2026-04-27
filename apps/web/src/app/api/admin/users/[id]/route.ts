import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

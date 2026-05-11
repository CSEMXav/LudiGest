import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  let callerRole: string | null = null;
  const mobilePayload = await verifyMobileToken(req);
  if (mobilePayload) {
    const u = await prisma.user.findUnique({ where: { id: mobilePayload.id }, select: { role: true } });
    callerRole = u?.role ?? null;
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    callerRole = session.user.role;
  }

  if (!callerRole) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const isAdmin = callerRole === "ADMIN";

  const users = await prisma.user.findMany({
    where: isAdmin ? { suspended: false } : { visibleInMembers: true, suspended: false },
    select: {
      id: true,
      nickname: true,
      email: true,
      name: true,
      visibleInMembers: true,
      _count: { select: { loans: true } },
      loans: { where: { returnedAt: null }, select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      nickname: u.nickname ?? u.email,
      totalLoans: u._count.loans,
      activeLoans: u.loans.length,
      ...(isAdmin && { visibleInMembers: u.visibleInMembers }),
    }))
  );
}

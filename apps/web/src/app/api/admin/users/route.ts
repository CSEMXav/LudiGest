import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { loans: true } },
      loans: {
        select: {
          id: true,
          returnedAt: true,
          dueAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      matricule: u.matricule,
      nickname: u.nickname,
      visibleInMembers: u.visibleInMembers,
      role: u.role,
      suspended: u.suspended,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt.toISOString(),
      location: u.location,
      totalLoans: u._count.loans,
      activeLoans: u.loans.filter((l) => !l.returnedAt).length,
      lateReturns: u.loans.filter(
        (l) => l.returnedAt && new Date(l.returnedAt) > new Date(l.dueAt)
      ).length,
    }))
  );
}

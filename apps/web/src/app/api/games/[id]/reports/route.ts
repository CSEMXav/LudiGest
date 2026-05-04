import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const reports = await prisma.gameReport.findMany({
      where: { gameId: params.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, reporterName: true, message: true, createdAt: true },
    });

    return NextResponse.json(reports.map((r) => ({
      id: r.id,
      reporterName: r.reporterName,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch {
    return NextResponse.json([]);
  }
}

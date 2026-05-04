import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; reportId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    await prisma.gameReport.delete({ where: { id: params.reportId } });
  } catch {
    // If record doesn't exist (e.g. legacy UserNotification-based report), try to delete from UserNotification
    try {
      await prisma.userNotification.deleteMany({
        where: { id: params.reportId, type: "GAME_REPORT" },
      });
    } catch { /* ignore */ }
  }

  return NextResponse.json({ success: true });
}

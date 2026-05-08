import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runSendReminders } from "@/lib/send-reminders";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  console.log(`[admin] run-reminders déclenché manuellement par ${session.user.email}`);
  const result = await runSendReminders();
  return NextResponse.json(result);
}

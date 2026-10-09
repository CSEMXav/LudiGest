import { NextRequest, NextResponse } from "next/server";
import { runSendReminders } from "@/lib/send-reminders";

// Les envois d'emails sont cadencés (limite de débit du service) : on laisse le temps de tous les traiter
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[cron] Unauthorized — CRON_SECRET mismatch. Header:", authHeader?.slice(0, 20));
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron] send-reminders triggered by Vercel cron");
  const result = await runSendReminders();
  return NextResponse.json(result);
}

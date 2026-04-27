import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const nextauthUrl = process.env.NEXTAUTH_URL;

  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY manquante" }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to") ?? "delivered@resend.dev";

  try {
    const result = await resend.emails.send({
      from: from || "LudiGest <onboarding@resend.dev>",
      to,
      subject: "Test LudiGest",
      html: "<p>Test email depuis LudiGest Vercel.</p>",
    });

    return NextResponse.json({
      ok: true,
      result,
      config: {
        apiKeyPrefix: apiKey.slice(0, 8) + "...",
        from: from || "(non défini → onboarding@resend.dev)",
        nextauthUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message ?? String(err),
      config: {
        apiKeyPrefix: apiKey.slice(0, 8) + "...",
        from: from || "(non défini → onboarding@resend.dev)",
        nextauthUrl,
      },
    }, { status: 500 });
  }
}

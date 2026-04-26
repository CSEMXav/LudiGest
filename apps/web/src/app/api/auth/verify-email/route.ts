import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse(html("Lien invalide", "Token manquant.", false), { headers: { "Content-Type": "text/html" } });
  }

  const record = await prisma.emailVerification.findUnique({ where: { token } });

  if (!record) {
    return new NextResponse(html("Lien invalide", "Ce lien de vérification est introuvable ou a déjà été utilisé.", false), { headers: { "Content-Type": "text/html" } });
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerification.delete({ where: { id: record.id } });
    return new NextResponse(html("Lien expiré", "Ce lien a expiré. Veuillez vous réinscrire.", false), { headers: { "Content-Type": "text/html" } });
  }

  await prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } });
  await prisma.emailVerification.delete({ where: { id: record.id } });

  return new NextResponse(html("Inscription confirmée ✓", "Votre email a été confirmé. Vous pouvez maintenant vous connecter à l'application LudiGest.", true), { headers: { "Content-Type": "text/html" } });
}

function html(title: string, message: string, success: boolean) {
  const color = success ? "#16a34a" : "#C8102E";
  const icon = success ? "✅" : "❌";
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — LudiGest</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb">
<div style="background:#fff;border-radius:16px;padding:40px;max-width:400px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="font-size:48px;margin-bottom:12px">${icon}</div>
  <h1 style="color:${color};font-size:22px;margin:0 0 12px">${title}</h1>
  <p style="color:#6b7280;margin:0 0 24px">${message}</p>
  <p style="color:#9ca3af;font-size:13px">🎲 Ludothèque BRED</p>
</div></body></html>`;
}

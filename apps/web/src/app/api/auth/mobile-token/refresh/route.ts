import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signMobileToken, verifyMobileTokenForRefresh } from "@/lib/mobile-auth";

/**
 * POST /api/auth/mobile-token/refresh — renouvelle le jeton de l'appli mobile sans redemander
 * le mot de passe. Le compte est relu en base : un compte supprimé ou suspendu n'est pas renouvelé,
 * et le nouveau jeton porte le rôle et la ludothèque à jour.
 */
export async function POST(req: NextRequest) {
  const payload = await verifyMobileTokenForRefresh(req);
  if (!payload?.id) return NextResponse.json({ error: "Session expirée." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || user.suspended || !user.emailVerified) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  const publicUser = { id: user.id, email: user.email, name: user.name, role: user.role, location: user.location };
  return NextResponse.json({ token: await signMobileToken(publicUser), user: publicUser });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) return NextResponse.json({ error: "Token et mot de passe requis." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    return NextResponse.json({ error: "Ce lien a expiré. Veuillez refaire la demande." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } });
  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

  return NextResponse.json({ success: true });
}

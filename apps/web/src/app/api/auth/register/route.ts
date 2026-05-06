import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { LOCATIONS } from "@ludigest/types";

export async function POST(req: NextRequest) {
  const { email, firstName, lastName, matricule, password, location, nickname, visibleInMembers } = await req.json();

  if (!email || !firstName || !lastName || !matricule || !password || !location) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }
  if (!LOCATIONS.includes(location)) {
    return NextResponse.json({ error: "Lieu de ludothèque invalide." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
  }

  const existingMatricule = await prisma.user.findUnique({ where: { matricule } });
  if (existingMatricule) {
    return NextResponse.json({ error: "Ce matricule est déjà utilisé." }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const name = `${firstName} ${lastName}`;

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      firstName,
      lastName,
      matricule,
      password: hashed,
      emailVerified: false,
      location,
      nickname: nickname || email.toLowerCase(),
      visibleInMembers: visibleInMembers !== false,
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerification.create({
    data: { userId: user.id, token, expiresAt },
  });

  await sendVerificationEmail(user.email, firstName, token, new URL(req.url).origin);

  return NextResponse.json({ success: true }, { status: 201 });
}

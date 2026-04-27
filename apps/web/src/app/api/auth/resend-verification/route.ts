import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email requis." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.emailVerified) {
    return NextResponse.json({ success: true });
  }

  await prisma.emailVerification.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.emailVerification.create({ data: { userId: user.id, token, expiresAt } });
  await sendVerificationEmail(user.email, user.firstName ?? user.name, token);

  return NextResponse.json({ success: true });
}

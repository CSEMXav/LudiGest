import nodemailer from "nodemailer";

export async function sendReminderEmail(to: string, name: string, gameName: string, dueAt: Date): Promise<void> {
  const dateStr = dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const msg = `Bonjour ${name}, votre emprunt du jeu "${gameName}" arrive à échéance le ${dateStr}. Pensez à le rendre à la ludothèque.`;

  if (!process.env.SMTP_HOST) {
    console.log(`\n📧 [DEV] Rappel pour ${to} : ${msg}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? '"LudiGest BRED" <noreply@bred.fr>',
    to,
    subject: `Rappel : rendez "${gameName}" avant le ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E">🎲 LudiGest — Rappel d'emprunt</h1>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Votre emprunt du jeu <strong>"${gameName}"</strong> arrive à échéance le <strong>${dateStr}</strong>.</p>
        <p>Pensez à le rendre à la ludothèque. Vous pouvez aussi le prolonger depuis l'application si vous en avez encore besoin.</p>
        <p style="color:#9ca3af;font-size:12px">🎲 Ludothèque BRED</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/api/auth/verify-email?token=${token}`;

  if (!process.env.SMTP_HOST) {
    console.log(`\n📧 [DEV] Lien de vérification pour ${to} :\n  ${link}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? '"LudiGest BRED" <noreply@bred.fr>',
    to,
    subject: "Confirmez votre inscription à la ludothèque BRED",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest</h1>
        <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Merci de vous être inscrit(e). Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte :</p>
        <a href="${link}" style="display:inline-block;background:#C8102E;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
          Confirmer mon inscription
        </a>
        <p style="color:#9ca3af;font-size:12px">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `,
  });
}

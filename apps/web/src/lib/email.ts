import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "LudiGest <onboarding@resend.dev>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Lien de vérification pour ${to} :\n  ${link}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
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

export async function sendReminderEmail(to: string, name: string, gameName: string, dueAt: Date): Promise<void> {
  const dateStr = dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Rappel pour ${to} : emprunt de "${gameName}" à rendre le ${dateStr}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
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

export async function sendOverdueEmail(to: string, name: string, gameName: string, dueAt: Date): Promise<void> {
  const dateStr = dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Retard pour ${to} : emprunt de "${gameName}" dû le ${dateStr}\n`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `⚠ Retard : veuillez rendre "${gameName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E">🎲 LudiGest — Retard d'emprunt</h1>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Le jeu <strong>"${gameName}"</strong> aurait dû être rendu le <strong>${dateStr}</strong>.</p>
        <p>Merci de le rapporter à la ludothèque dès que possible.</p>
        <p style="color:#9ca3af;font-size:12px">🎲 Ludothèque BRED</p>
      </div>
    `,
  });
}

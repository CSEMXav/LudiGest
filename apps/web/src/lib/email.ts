import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const FROM = process.env.RESEND_FROM ?? "LudiGest <onboarding@resend.dev>";

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);
}

function templateToHtml(body: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
    <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest</h1>
    <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
    ${body.split("\n").map((l) => l.trim() ? `<p style="margin:4px 0">${l}</p>` : "<br>").join("")}
  </div>`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendVerificationEmail(to: string, name: string, token: string, baseUrl?: string): Promise<void> {
  const base = baseUrl ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${base}/api/auth/verify-email?token=${token}`;

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

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Lien de réinitialisation pour ${to} :\n  ${link}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Réinitialisation de votre mot de passe LudiGest",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest</h1>
        <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
        <a href="${link}" style="display:inline-block;background:#C8102E;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#9ca3af;font-size:12px">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      </div>
    `,
  });
}

export async function sendSessionInviteEmail(to: string, name: string, sessionName: string, sessionDate: Date, sessionLocation: string, sessionTime: string, registerUrl: string): Promise<void> {
  const dateStr = sessionDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Invitation session ludique pour ${to} : "${sessionName}" le ${dateStr}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🎲 Session ludique : "${sessionName}" — Inscrivez-vous !`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest — Soirée Ludique</h1>
        <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Une nouvelle session ludique est disponible !</p>
        <div style="background:#fff5f5;border-left:4px solid #C8102E;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#111">${sessionName}</p>
          <p style="margin:0 0 4px;color:#374151">📅 ${dateStr}</p>
          <p style="margin:0 0 4px;color:#374151">🕐 ${sessionTime}</p>
          <p style="margin:0;color:#374151">📍 ${sessionLocation}</p>
        </div>
        <a href="${registerUrl}" style="display:inline-block;background:#C8102E;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
          Je m'inscris
        </a>
        <p style="color:#9ca3af;font-size:12px">🎲 Ludothèque BRED</p>
      </div>
    `,
  });
}

export async function sendSessionReminderEmail(to: string, name: string, sessionName: string, sessionDate: Date, sessionLocation: string, sessionTime: string): Promise<void> {
  const dateStr = sessionDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Rappel soirée pour ${to} : "${sessionName}" le ${dateStr}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `⏰ Rappel : Session ludique "${sessionName}" bientôt !`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest — Rappel Session</h1>
        <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
        <p>Bonjour <strong>${name}</strong>,</p>
        <p>Rappel : vous êtes inscrit(e) à la session ludique suivante :</p>
        <div style="background:#fff5f5;border-left:4px solid #C8102E;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#111">${sessionName}</p>
          <p style="margin:0 0 4px;color:#374151">📅 ${dateStr}</p>
          <p style="margin:0 0 4px;color:#374151">🕐 ${sessionTime}</p>
          <p style="margin:0;color:#374151">📍 ${sessionLocation}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px">🎲 Ludothèque BRED</p>
      </div>
    `,
  });
}

export async function sendConfiguredSessionInviteEmail(
  to: string,
  vars: { userName: string; sessionName: string; sessionDate: string; sessionTime: string; sessionLocation: string; registerUrl: string; inviterName?: string }
): Promise<void> {
  const config = await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const defaultSubject = `🎲 Invitation session : "${vars.sessionName}" — le ${vars.sessionDate}`;
  const defaultBody = `Bonjour ${vars.userName},\n\nVous avez été invité(e) à la session ludique "${vars.sessionName}".\n\nDate : ${vars.sessionDate}\nHeure : ${vars.sessionTime}\nLieu : ${vars.sessionLocation}${vars.inviterName ? `\n\nInvitation envoyée par : ${vars.inviterName}` : ""}\n\nCliquez ici pour vous inscrire : ${vars.registerUrl}\n\nLudothèque BRED`;

  const subject = config?.sessionInviteSubject
    ? applyTemplate(config.sessionInviteSubject, vars as Record<string, string>)
    : defaultSubject;
  const bodyText = config?.sessionInviteBody
    ? applyTemplate(config.sessionInviteBody, vars as Record<string, string>)
    : defaultBody;

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Invitation session pour ${to} :\n  ${vars.registerUrl}\n`);
    return;
  }

  await resend.emails.send({ from: FROM, to, subject, html: templateToHtml(bodyText) });
}

export async function sendGameReportEmail(to: string, adminName: string, reporterName: string, gameName: string, gameUrl: string, reportMessage: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Signalement jeu pour ${to} : "${gameName}" — ${reportMessage}\n`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `🚨 Signalement jeu : "${gameName}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest — Signalement</h1>
        <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
        <p>Bonjour <strong>${adminName}</strong>,</p>
        <p><strong>${reporterName}</strong> a signalé un problème sur le jeu <strong>"${gameName}"</strong> :</p>
        <div style="background:#fff5f5;border-left:4px solid #C8102E;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0;color:#374151">${reportMessage}</p>
        </div>
        <a href="${gameUrl}" style="display:inline-block;background:#C8102E;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
          Voir la fiche du jeu
        </a>
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

export async function sendSessionUpdateEmail(
  to: string,
  userName: string,
  sessionName: string,
  sessionDate: string,
  sessionTime: string,
  sessionLocation: string,
  sessionsUrl: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Mise à jour session pour ${to} : "${sessionName}" le ${sessionDate} à ${sessionTime}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `🎲 Session mise à jour : "${sessionName}" — le ${sessionDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h1 style="color:#C8102E;margin-bottom:4px">🎲 LudiGest — Mise à jour de session</h1>
        <p style="color:#6b7280;margin-top:0">Ludothèque BRED</p>
        <p>Bonjour <strong>${userName}</strong>,</p>
        <p>Les informations de la session à laquelle vous êtes inscrit(e) ont été mises à jour :</p>
        <div style="background:#fff5f5;border-left:4px solid #C8102E;padding:16px;border-radius:8px;margin:16px 0">
          <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#111">${sessionName}</p>
          <p style="margin:0 0 4px;color:#374151">📅 ${sessionDate}</p>
          <p style="margin:0 0 4px;color:#374151">🕐 ${sessionTime}</p>
          <p style="margin:0;color:#374151">📍 ${sessionLocation}</p>
        </div>
        <p>Pensez à vérifier vos disponibilités pour cette nouvelle date.</p>
        <a href="${sessionsUrl}" style="display:inline-block;background:#C8102E;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;margin:16px 0">
          Voir les sessions
        </a>
        <p style="color:#9ca3af;font-size:12px">🎲 Ludothèque BRED</p>
      </div>
    `,
  });
}

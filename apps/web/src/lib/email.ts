import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const FROM = process.env.RESEND_FROM ?? "LudiGest <onboarding@resend.dev>";

function getSiteUrl() {
  return process.env.NEXTAUTH_URL ?? "https://ludigest.vercel.app";
}

/* ------------------------------------------------------------------ */
/*  Charte graphique commune des emails                                */
/* ------------------------------------------------------------------ */

const BRAND = {
  bg: "#f4efe6",
  card: "#ffffff",
  ink: "#1e1610",
  ink2: "#5b4d40",
  ink3: "#9a8b7c",
  rule: "#ece1cd",
  primary: "#d24a1f",
  teal: "#1f5a6b",
  soft: "#fef9f0",
};

function logoUrl() { return `${getSiteUrl()}/email/logo.png`; }
function defaultHeroUrl() { return `${getSiteUrl()}/email/hero.jpg`; }

/** Échappe les caractères HTML spéciaux pour éviter l'injection dans les emails. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v), template);
}

/** Remplace les "\n" littéraux (barre oblique + n) par de vrais retours à la ligne. */
function normalizeNewlines(text: string): string {
  return text.replace(/\\r?\\n/g, "\n").replace(/\r\n/g, "\n");
}

/** Transforme les URLs d'un texte déjà échappé en liens cliquables. */
function autoLink(escaped: string): string {
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const clean = url.replace(/[.,;:!?)]+$/, "");
    const tail = url.slice(clean.length);
    return `<a href="${clean}" style="color:${BRAND.primary};font-weight:bold;text-decoration:none">${clean}</a>${tail}`;
  });
}

const INFO_ICONS: Record<string, string> = {
  date: "📅", heure: "🕐", lieu: "📍", inscriptions: "📝", jeu: "🎲", emprunt: "🎲", session: "🎲", "à rendre": "⏳", retour: "⏳",
};

/** Libellés (début de ligne) affichés dans l'encadré d'informations. */
const INFO_LABELS = ["date", "heure", "lieu", "inscription", "jeu", "emprunt", "session", "à rendre", "a rendre", "retour", "places", "invitation envoyée par", "invité par", "accompagnant"];

function infoIcon(label: string): string {
  const key = label.trim().toLowerCase();
  for (const [k, icon] of Object.entries(INFO_ICONS)) if (key.startsWith(k)) return icon;
  return "•";
}

function infoBoxHtml(rows: { icon: string; label: string; value: string }[]): string {
  if (rows.length === 0) return "";
  const lines = rows.map((r) =>
    `<tr><td style="padding:3px 0;font-size:15px;line-height:1.5;color:${BRAND.ink}"><span style="display:inline-block;width:26px">${r.icon}</span><strong>${r.label}</strong> ${r.value}</td></tr>`
  ).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:14px 0;background:${BRAND.soft};border-left:4px solid ${BRAND.primary};border-radius:10px"><tr><td style="padding:12px 16px"><table role="presentation" cellpadding="0" cellspacing="0">${lines}</table></td></tr></table>`;
}

/**
 * Convertit un texte de modèle (saisi par l'admin) en HTML :
 * paragraphes, encadré pour les lignes "Date : … / Heure : … / Lieu : …", liens cliquables.
 */
function renderTextBody(text: string): string {
  const lines = normalizeNewlines(text).split("\n").map((l) => l.trim());
  const out: string[] = [];
  let infoRows: { icon: string; label: string; value: string }[] = [];
  const flushInfo = () => { if (infoRows.length) { out.push(infoBoxHtml(infoRows)); infoRows = []; } };

  for (const raw of lines) {
    if (!raw) { flushInfo(); continue; }
    const cleaned = raw.replace(/^[^A-Za-zÀ-ÿ]+/, "");
    const m = cleaned.match(/^([A-Za-zÀ-ÿ'’ ]{2,30}?)\s*:\s*(.+)$/);
    const isInfoLabel = !!m && INFO_LABELS.some((k) => m[1].trim().toLowerCase().startsWith(k));
    if (m && isInfoLabel && !/^https?:/i.test(raw) && m[2].length < 120 && !m[2].includes("://")) {
      infoRows.push({ icon: infoIcon(m[1]), label: `${escapeHtml(m[1].trim())} :`, value: escapeHtml(m[2].trim()) });
      continue;
    }
    flushInfo();
    const isSignature = /^ludothèque (csem|bred)$/i.test(raw);
    const style = isSignature
      ? `margin:18px 0 0;font-size:14px;color:${BRAND.ink3};font-style:italic`
      : `margin:0 0 12px;font-size:15px;line-height:1.55;color:${BRAND.ink2}`;
    out.push(`<p style="${style}">${autoLink(escapeHtml(raw))}</p>`);
  }
  flushInfo();
  return out.join("");
}

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px"><tr><td style="background:${BRAND.primary};border-radius:999px"><a href="${url}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a></td></tr></table>`;
}

/** Gabarit commun : en-tête LudiGest, image d'illustration, contenu, bouton, pied de page. */
function emailLayout(o: { title?: string; preheader?: string; heroUrl?: string | null; bodyHtml: string; ctaUrl?: string; ctaLabel?: string; footerNote?: string }): string {
  const siteUrl = getSiteUrl();
  const hero = o.heroUrl === null ? "" : `<tr><td style="background:${BRAND.teal}"><img src="${escapeHtml(o.heroUrl ?? defaultHeroUrl())}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>`;
  const preheader = o.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BRAND.bg};opacity:0">${escapeHtml(o.preheader)}</div>`
    : "";
  const title = o.title ? `<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:${BRAND.ink};font-weight:800">${escapeHtml(o.title)}</h1>` : "";
  const cta = o.ctaUrl ? ctaButton(o.ctaUrl, o.ctaLabel ?? "Ouvrir LudiGest") : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LudiGest</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${BRAND.card};border-radius:18px;overflow:hidden;border:1px solid ${BRAND.rule}">
    <tr><td style="background:${BRAND.teal};padding:16px 24px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle"><img src="${logoUrl()}" alt="LudiGest" width="44" height="44" style="display:block;border-radius:12px;border:0"></td>
        <td style="vertical-align:middle;padding-left:12px"><div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">LudiGest</div><div style="font-size:12px;color:rgba(255,255,255,0.8)">Ludothèque CSEM</div></td>
      </tr></table>
    </td></tr>
    ${hero}
    <tr><td style="padding:26px 28px 10px">${title}${o.bodyHtml}</td></tr>
    ${cta ? `<tr><td style="padding:0 28px 22px">${cta}</td></tr>` : ""}
    <tr><td style="padding:16px 28px 20px;border-top:1px solid ${BRAND.rule};font-size:12px;line-height:1.5;color:${BRAND.ink3}">
      🎲 <a href="${siteUrl}" style="color:${BRAND.ink3};font-weight:bold;text-decoration:none">LudiGest — Ludothèque CSEM</a><br>
      ${escapeHtml(o.footerNote ?? "Vous recevez cet email car vous êtes membre de la ludothèque CSEM.")}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Rend un modèle texte (déjà interpolé) dans le gabarit commun. */
export function templateToHtml(body: string, ctaUrl?: string, ctaLabel?: string, opts?: { title?: string; heroUrl?: string | null; preheader?: string }): string {
  return emailLayout({ title: opts?.title, heroUrl: opts?.heroUrl, preheader: opts?.preheader, bodyHtml: renderTextBody(body), ctaUrl, ctaLabel });
}

function sessionInfoRows(sessionDate: string, sessionTime: string, sessionLocation: string, registrationDeadline?: string | null) {
  const rows = [
    { icon: "📅", label: "Date :", value: escapeHtml(sessionDate) },
    { icon: "🕐", label: "Heure :", value: escapeHtml(sessionTime) },
    { icon: "📍", label: "Lieu :", value: escapeHtml(sessionLocation) },
  ];
  if (registrationDeadline) rows.push({ icon: "📝", label: "Inscriptions jusqu'au :", value: escapeHtml(registrationDeadline) });
  return rows;
}

function p(html: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${BRAND.ink2}">${html}</p>`;
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/* ------------------------------------------------------------------ */
/*  Compte                                                             */
/* ------------------------------------------------------------------ */

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
    subject: "Confirmez votre inscription à la ludothèque CSEM",
    html: emailLayout({
      title: "Bienvenue à la ludothèque !",
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`) + p("Merci de vous être inscrit(e). Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte :"),
      ctaUrl: link,
      ctaLabel: "Confirmer mon inscription",
      footerNote: "Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.",
    }),
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
    html: emailLayout({
      title: "Réinitialiser votre mot de passe",
      heroUrl: null,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`) + p("Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :"),
      ctaUrl: link,
      ctaLabel: "Réinitialiser mon mot de passe",
      footerNote: "Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.",
    }),
  });
}

/* ------------------------------------------------------------------ */
/*  Emprunts                                                           */
/* ------------------------------------------------------------------ */

export async function sendReminderEmail(to: string, name: string, gameName: string, dueAt: Date, gameId?: string): Promise<void> {
  const dateStr = dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const gameUrl = gameId ? `${getSiteUrl()}/games/${gameId}` : getSiteUrl();

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Rappel pour ${to} : emprunt de "${gameName}" à rendre le ${dateStr}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Rappel : rendez "${gameName}" avant le ${dateStr}`,
    html: emailLayout({
      title: "Rappel d'emprunt",
      heroUrl: null,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`)
        + p("Votre emprunt arrive bientôt à échéance :")
        + infoBoxHtml([{ icon: "🎲", label: "Jeu :", value: escapeHtml(gameName) }, { icon: "⏳", label: "À rendre avant le :", value: escapeHtml(dateStr) }])
        + p("Pensez à le rendre à la ludothèque. Vous pouvez aussi le prolonger depuis l'application si vous en avez encore besoin."),
      ctaUrl: gameUrl,
      ctaLabel: "Voir mon emprunt",
    }),
  });
}

export async function sendOverdueEmail(to: string, name: string, gameName: string, dueAt: Date, gameId?: string): Promise<void> {
  const dateStr = dueAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const gameUrl = gameId ? `${getSiteUrl()}/games/${gameId}` : getSiteUrl();
  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Retard pour ${to} : emprunt de "${gameName}" dû le ${dateStr}\n`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `⚠ Retard : veuillez rendre "${gameName}"`,
    html: emailLayout({
      title: "Retard d'emprunt",
      heroUrl: null,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`)
        + p("Le jeu ci-dessous aurait déjà dû être rendu :")
        + infoBoxHtml([{ icon: "🎲", label: "Jeu :", value: escapeHtml(gameName) }, { icon: "⏳", label: "Date de retour prévue :", value: escapeHtml(dateStr) }])
        + p("Merci de le rapporter à la ludothèque dès que possible."),
      ctaUrl: gameUrl,
      ctaLabel: "Voir le jeu",
    }),
  });
}

export async function sendGameAvailableEmail(to: string, name: string, gameName: string, gameUrl: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Jeu disponible pour ${to} : "${gameName}"\n`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `🎲 "${gameName}" est de nouveau disponible !`,
    html: emailLayout({
      title: "Bonne nouvelle !",
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`)
        + p("Le jeu que vous attendiez est de nouveau disponible à la ludothèque :")
        + infoBoxHtml([{ icon: "🎲", label: "Jeu :", value: escapeHtml(gameName) }]),
      ctaUrl: gameUrl,
      ctaLabel: "Voir la fiche du jeu",
    }),
  });
}

export async function sendGameWantedEmail(to: string, borrowerName: string, gameName: string, gameUrl: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Jeu convoité pour emprunteur ${to} : "${gameName}"\n`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `💡 Quelqu'un attend "${gameName}" — pensez à le rendre !`,
    html: emailLayout({
      title: "Quelqu'un attend votre jeu",
      heroUrl: null,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(borrowerName)}</strong>,`)
        + p("Un(e) collègue attend de pouvoir emprunter le jeu que vous avez actuellement :")
        + infoBoxHtml([{ icon: "🎲", label: "Jeu :", value: escapeHtml(gameName) }])
        + p("Si vous avez fini de jouer, pensez à le ramener à la ludothèque !"),
      ctaUrl: gameUrl,
      ctaLabel: "Voir le jeu",
    }),
  });
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
    html: emailLayout({
      title: "Signalement sur un jeu",
      heroUrl: null,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(adminName)}</strong>,`)
        + p(`<strong>${escapeHtml(reporterName)}</strong> a signalé un problème sur le jeu <strong>${escapeHtml(gameName)}</strong> :`)
        + `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:14px 0;background:${BRAND.soft};border-left:4px solid ${BRAND.primary};border-radius:10px"><tr><td style="padding:12px 16px;font-size:15px;line-height:1.5;color:${BRAND.ink}">${escapeHtml(reportMessage)}</td></tr></table>`,
      ctaUrl: gameUrl,
      ctaLabel: "Voir la fiche du jeu",
      footerNote: "Vous recevez cet email en tant qu'administrateur de la ludothèque.",
    }),
  });
}

export async function sendConfiguredManualOverdueEmail(
  to: string,
  vars: { userName: string; gameName: string; dueAt: string },
  preloadedConfig?: Awaited<ReturnType<typeof prisma.emailConfig.findUnique>> | null
): Promise<void> {
  const config = preloadedConfig !== undefined
    ? preloadedConfig
    : await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const allVars = { ...vars, siteUrl: getSiteUrl() } as Record<string, string>;
  const subject = config?.manualOverdueSubject
    ? applyTemplate(config.manualOverdueSubject, allVars)
    : `⚠ Retard (rappel admin) : veuillez rendre "${vars.gameName}"`;
  const bodyText = config?.manualOverdueBody
    ? applyTemplate(config.manualOverdueBody, allVars)
    : `Bonjour ${vars.userName},\n\nCe rappel vous est envoyé par l'administrateur.\n\nJeu : ${vars.gameName}\nÀ rendre avant le : ${vars.dueAt}\n\nLudothèque CSEM`;

  const resend = getResend();
  if (!resend) { console.log(`\n📧 [DEV] Retard manuel pour ${to} : "${vars.gameName}"\n`); return; }
  await resend.emails.send({ from: FROM, to, subject, html: templateToHtml(bodyText, undefined, undefined, { title: "Retard d'emprunt", heroUrl: null }) });
}

export async function sendConfiguredWaitlistEmail(
  to: string,
  vars: { userName: string; gameName: string; gameUrl: string },
  preloadedConfig?: Awaited<ReturnType<typeof prisma.emailConfig.findUnique>> | null
): Promise<void> {
  const config = preloadedConfig !== undefined
    ? preloadedConfig
    : await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const allVars = { ...vars, siteUrl: getSiteUrl() } as Record<string, string>;
  const subject = config?.waitlistSubject
    ? applyTemplate(config.waitlistSubject, allVars)
    : `💡 Quelqu'un attend "${vars.gameName}" — pensez à le rendre !`;
  const bodyText = config?.waitlistBody
    ? applyTemplate(config.waitlistBody, allVars)
    : `Bonjour ${vars.userName},\n\nUn(e) collègue attend le jeu suivant :\n\nJeu : ${vars.gameName}\n\nPensez à le ramener à la ludothèque !\n\nLudothèque CSEM`;

  const resend = getResend();
  if (!resend) { console.log(`\n📧 [DEV] Waitlist pour ${to} : "${vars.gameName}"\n`); return; }
  await resend.emails.send({ from: FROM, to, subject, html: templateToHtml(bodyText, vars.gameUrl, "Voir le jeu", { title: "Quelqu'un attend votre jeu", heroUrl: null }) });
}

/* ------------------------------------------------------------------ */
/*  Sessions ludiques                                                  */
/* ------------------------------------------------------------------ */

export async function sendSessionInviteEmail(to: string, name: string, sessionName: string, sessionDate: Date, sessionLocation: string, sessionTime: string, registerUrl: string, registrationDeadline?: string | null, imageUrl?: string | null): Promise<void> {
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
    html: emailLayout({
      title: sessionName,
      preheader: `${dateStr} à ${sessionTime} — ${sessionLocation}`,
      heroUrl: imageUrl || undefined,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`)
        + p("Une nouvelle session ludique est ouverte aux inscriptions !")
        + infoBoxHtml(sessionInfoRows(dateStr, sessionTime, sessionLocation, registrationDeadline)),
      ctaUrl: registerUrl,
      ctaLabel: "Je m'inscris",
    }),
  });
}

export async function sendSessionReminderEmail(to: string, name: string, sessionName: string, sessionDate: Date, sessionLocation: string, sessionTime: string, imageUrl?: string | null): Promise<void> {
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
    html: emailLayout({
      title: `Rappel : ${sessionName}`,
      preheader: `${dateStr} à ${sessionTime} — ${sessionLocation}`,
      heroUrl: imageUrl || undefined,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(name)}</strong>,`)
        + p("Petit rappel : vous êtes inscrit(e) à la session ludique suivante.")
        + infoBoxHtml(sessionInfoRows(dateStr, sessionTime, sessionLocation))
        + p("À très vite !"),
      ctaUrl: `${getSiteUrl()}/sessions`,
      ctaLabel: "Voir la session",
    }),
  });
}

export async function sendSessionUpdateEmail(
  to: string,
  userName: string,
  sessionName: string,
  sessionDate: string,
  sessionTime: string,
  sessionLocation: string,
  sessionsUrl: string,
  registrationDeadline?: string | null,
  imageUrl?: string | null
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
    html: emailLayout({
      title: `Mise à jour : ${sessionName}`,
      preheader: `${sessionDate} à ${sessionTime} — ${sessionLocation}`,
      heroUrl: imageUrl || undefined,
      bodyHtml: p(`Bonjour <strong>${escapeHtml(userName)}</strong>,`)
        + p("Les informations de la session à laquelle vous êtes inscrit(e) ont été mises à jour :")
        + infoBoxHtml(sessionInfoRows(sessionDate, sessionTime, sessionLocation, registrationDeadline))
        + p("Si ces nouvelles conditions ne vous conviennent plus, vous pouvez vous désinscrire depuis l'application."),
      ctaUrl: sessionsUrl,
      ctaLabel: "Voir mes sessions",
    }),
  });
}

export async function sendConfiguredSessionInviteEmail(
  to: string,
  vars: { userName: string; sessionName: string; sessionDate: string; sessionTime: string; sessionLocation: string; registerUrl: string; inviterName?: string; registrationDeadline?: string | null; imageUrl?: string | null },
  preloadedConfig?: Awaited<ReturnType<typeof prisma.emailConfig.findUnique>> | null
): Promise<void> {
  const config = preloadedConfig !== undefined
    ? preloadedConfig
    : await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const deadlineLine = vars.registrationDeadline ? `Inscriptions jusqu'au : ${vars.registrationDeadline}` : "";
  const defaultSubject = `🎲 Invitation session : "${vars.sessionName}" — le ${vars.sessionDate}`;
  const defaultBody = `Bonjour ${vars.userName},\n\nVous avez été invité(e) à la session ludique "${vars.sessionName}".\n\nDate : ${vars.sessionDate}\nHeure : ${vars.sessionTime}\nLieu : ${vars.sessionLocation}${deadlineLine ? `\n${deadlineLine}` : ""}${vars.inviterName ? `\n\nInvitation envoyée par : ${vars.inviterName}` : ""}\n\nCliquez ici pour vous inscrire : ${vars.registerUrl}\n\nLudothèque CSEM`;

  const allVars = { ...vars, inviterName: vars.inviterName ?? "", registrationDeadline: vars.registrationDeadline ?? "", imageUrl: "", siteUrl: getSiteUrl() } as Record<string, string>;
  const subject = config?.sessionInviteSubject
    ? applyTemplate(config.sessionInviteSubject, allVars)
    : defaultSubject;
  let bodyText = config?.sessionInviteBody
    ? applyTemplate(config.sessionInviteBody, allVars)
    : defaultBody;
  // Si le modèle admin n'utilise pas la variable, on ajoute quand même la date limite
  if (config?.sessionInviteBody && deadlineLine && !config.sessionInviteBody.includes("{{registrationDeadline}}")) {
    bodyText += `\n\n${deadlineLine}`;
  }

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Invitation session pour ${to} :\n  ${vars.registerUrl}\n`);
    return;
  }

  await resend.emails.send({
    from: FROM, to, subject,
    html: templateToHtml(bodyText, vars.registerUrl, "Je m'inscris", {
      title: vars.sessionName,
      heroUrl: vars.imageUrl || undefined,
      preheader: `${vars.sessionDate} à ${vars.sessionTime} — ${vars.sessionLocation}`,
    }),
  });
}

export async function sendConfiguredSessionReminderEmail(
  to: string,
  vars: { userName: string; sessionName: string; sessionDate: string; sessionTime: string; sessionLocation: string; sessionUrl: string; imageUrl?: string | null },
  preloadedConfig?: Awaited<ReturnType<typeof prisma.emailConfig.findUnique>> | null
): Promise<void> {
  const config = preloadedConfig !== undefined
    ? preloadedConfig
    : await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const defaultSubject = `⏰ Rappel session : "${vars.sessionName}" c'est bientôt !`;
  const defaultBody = `Bonjour ${vars.userName},\n\nRappel : vous êtes inscrit(e) à la session ludique "${vars.sessionName}".\n\nDate : ${vars.sessionDate}\nHeure : ${vars.sessionTime}\nLieu : ${vars.sessionLocation}\n\nLudothèque CSEM`;

  const allVars = { ...vars, imageUrl: "", siteUrl: getSiteUrl() } as Record<string, string>;
  const subject = config?.sessionReminderSubject
    ? applyTemplate(config.sessionReminderSubject, allVars)
    : defaultSubject;
  const bodyText = config?.sessionReminderBody
    ? applyTemplate(config.sessionReminderBody, allVars)
    : defaultBody;

  const resend = getResend();
  if (!resend) { console.log(`[DEV] Rappel session pour ${to}: ${vars.sessionName}`); return; }
  await resend.emails.send({
    from: FROM, to, subject,
    html: templateToHtml(bodyText, vars.sessionUrl, "Voir la session", {
      title: `Rappel : ${vars.sessionName}`,
      heroUrl: vars.imageUrl || undefined,
      preheader: `${vars.sessionDate} à ${vars.sessionTime} — ${vars.sessionLocation}`,
    }),
  });
}

/* ------------------------------------------------------------------ */
/*  Annonce "Nouveaux jeux" (admin → tous les membres)                 */
/* ------------------------------------------------------------------ */

export interface NewGameCard {
  id: string;
  name: string;
  category: string;
  summary: string | null;
  minAge: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  duration: number | null;
  coverUrl: string | null;
}

const NEW_GAMES_DEFAULT_SUBJECT = "🎲 Nouveaux jeux à la ludothèque !";
const NEW_GAMES_DEFAULT_BODY = "Bonjour {{userName}},\n\nDe nouveaux jeux viennent d'arriver à la ludothèque et sont disponibles à l'emprunt dès maintenant :\n\n{{gamesList}}\n\nÀ très vite à la ludothèque !\n\nLudothèque CSEM";

const GAME_CATEGORY_LABELS: Record<string, string> = {
  escape: "Escape", famille: "Famille", ambiance: "Ambiance", enfant: "Enfant", "initié": "Initié", expert: "Expert",
};

function gameCardHtml(g: NewGameCard): string {
  const url = `${getSiteUrl()}/games/${g.id}`;
  const meta: string[] = [];
  if (g.minPlayers && g.maxPlayers) meta.push(`👥 ${g.minPlayers === g.maxPlayers ? g.minPlayers : `${g.minPlayers}–${g.maxPlayers}`} joueurs`);
  else if (g.minPlayers) meta.push(`👥 ${g.minPlayers}+ joueurs`);
  else if (g.maxPlayers) meta.push(`👥 jusqu'à ${g.maxPlayers} joueurs`);
  if (g.duration) meta.push(`⏱ ${g.duration} min`);
  if (g.minAge) meta.push(`🎂 ${g.minAge} ans et +`);
  const rawSummary = (g.summary ?? "").trim();
  const summary = rawSummary.length > 240 ? rawSummary.slice(0, 237).trimEnd() + "…" : rawSummary;
  const category = GAME_CATEGORY_LABELS[g.category] ?? g.category;
  const cover = g.coverUrl
    ? `<img src="${escapeHtml(g.coverUrl)}" alt="" width="88" height="88" style="width:88px;height:88px;object-fit:cover;border-radius:10px;display:block;border:1px solid ${BRAND.rule}">`
    : `<div style="width:88px;height:88px;border-radius:10px;background:${BRAND.soft};text-align:center;line-height:88px;font-size:36px">🎲</div>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px;border:1px solid ${BRAND.rule};border-radius:12px;background:#fff">
  <tr>
    <td width="88" valign="top" style="padding:12px">${cover}</td>
    <td valign="top" style="padding:12px 12px 12px 0">
      <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:${BRAND.ink}"><a href="${url}" style="color:${BRAND.ink};text-decoration:none">${escapeHtml(g.name)}</a></p>
      <p style="margin:0 0 6px"><span style="display:inline-block;background:${BRAND.soft};color:${BRAND.primary};font-size:11px;font-weight:bold;padding:2px 8px;border-radius:999px">${escapeHtml(category)}</span></p>
      ${meta.length ? `<p style="margin:0 0 6px;font-size:12px;color:${BRAND.ink3}">${meta.map(escapeHtml).join(" · ")}</p>` : ""}
      ${summary ? `<p style="margin:0 0 8px;font-size:13px;color:${BRAND.ink2};line-height:1.45">${escapeHtml(summary)}</p>` : ""}
      <a href="${url}" style="font-size:12px;font-weight:bold;color:${BRAND.primary};text-decoration:none">Voir la fiche →</a>
    </td>
  </tr>
</table>`;
}

/** Construit l'objet et le HTML de l'email "Nouveaux jeux" à partir de la config admin. */
export function renderNewGamesEmail(
  config: { newGamesSubject?: string | null; newGamesBody?: string | null } | null | undefined,
  vars: { userName: string },
  games: NewGameCard[]
): { subject: string; html: string } {
  const siteUrl = getSiteUrl();
  const allVars: Record<string, string> = { userName: vars.userName, gamesCount: String(games.length), siteUrl };
  const subjectTpl = config?.newGamesSubject?.trim() ? config.newGamesSubject : NEW_GAMES_DEFAULT_SUBJECT;
  const bodyTpl = normalizeNewlines(config?.newGamesBody?.trim() ? config.newGamesBody : NEW_GAMES_DEFAULT_BODY);
  const subject = applyTemplate(subjectTpl, allVars);

  const cards = `<div style="margin:6px 0 14px">${games.map(gameCardHtml).join("")}</div>`;
  const hasPlaceholder = bodyTpl.includes("{{gamesList}}");
  const [before, after] = hasPlaceholder ? bodyTpl.split("{{gamesList}}") : [bodyTpl, ""];
  const bodyHtml = renderTextBody(applyTemplate(before, allVars)) + cards + (after ? renderTextBody(applyTemplate(after, allVars)) : "");

  const html = emailLayout({
    title: games.length > 1 ? `${games.length} nouveaux jeux à découvrir` : "Un nouveau jeu à découvrir",
    preheader: games.map((g) => g.name).slice(0, 4).join(", "),
    bodyHtml,
    ctaUrl: `${siteUrl}/games`,
    ctaLabel: "Voir tous les jeux",
  });
  return { subject, html };
}

export async function sendNewGamesEmail(
  to: string,
  vars: { userName: string },
  games: NewGameCard[],
  preloadedConfig?: Awaited<ReturnType<typeof prisma.emailConfig.findUnique>> | null
): Promise<void> {
  const config = preloadedConfig !== undefined
    ? preloadedConfig
    : await prisma.emailConfig.findUnique({ where: { id: "singleton" } }).catch(() => null);
  const { subject, html } = renderNewGamesEmail(config, vars, games);

  const resend = getResend();
  if (!resend) {
    console.log(`\n📧 [DEV] Nouveaux jeux pour ${to} : ${games.map((g) => g.name).join(", ")}\n`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

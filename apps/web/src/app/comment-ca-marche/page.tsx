import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comment ça marche — LudiGest" };

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: string; circle: string }> = {
  enfant:   { label: "Enfant",   color: "#92400E", bg: "#fef3c7", icon: "🧸",        circle: "#F59E0B" },
  famille:  { label: "Famille",  color: "#3F6212", bg: "#f7fee7", icon: "👨‍👩‍👧‍👦",    circle: "#84CC16" },
  ambiance: { label: "Ambiance", color: "#fff",    bg: "#1e3a8a", icon: "🎉",         circle: "#1e3a8a" },
  escape:   { label: "Escape",   color: "#fff",    bg: "#C8102E", icon: "🔐",         circle: "#C8102E" },
  "initié": { label: "Initié",   color: "#374151", bg: "#f3f4f6", icon: "🧠",         circle: "#6B7280" },
  expert:   { label: "Expert",   color: "#fff",    bg: "#15803d", icon: "🏆",         circle: "#15803D" },
};

const CATEGORY_ORDER = ["enfant", "famille", "ambiance", "escape", "initié", "expert"];

export default async function CommentCaMarchePage() {
  const [categoryGroups, totalGames] = await Promise.all([
    prisma.game.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { status: { not: "SUSPENDED" } },
    }),
    prisma.game.count({ where: { status: { not: "SUSPENDED" } } }),
  ]);

  const sortedCategories = [...categoryGroups].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.category);
    const ib = CATEGORY_ORDER.indexOf(b.category);
    if (ia === -1 && ib === -1) return b._count.id - a._count.id;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <main style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a1a1a" }}>

      {/* Hero banner — sunburst with category circles */}
      <div style={{
        background: "conic-gradient(from 180deg at 50% 110%, #FDE68A 0deg, #FCA5A5 45deg, #C4B5FD 90deg, #93C5FD 135deg, #6EE7B7 180deg, #A3E635 225deg, #FDE68A 270deg, #FCA5A5 315deg, #FDE68A 360deg)",
        padding: "48px 24px 40px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Semi-transparent white overlay for readability */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.55)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "#C8102E", color: "#fff", fontWeight: 700, fontSize: 12, padding: "5px 16px", borderRadius: 20, marginBottom: 16, letterSpacing: 1.5, textTransform: "uppercase" as const }}>
            🎲 LudiGest — Ludothèque CSEM
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111", margin: "0 0 8px", lineHeight: 1.2 }}>
            La ludothèque du CSEM met à votre disposition<br />des jeux à l'emprunt
          </h1>
          <p style={{ fontSize: 15, color: "#374151", margin: "0 0 28px" }}>
            Ces jeux sont classés par catégorie dans les armoires correspondantes&nbsp;:
          </p>

          {/* Category circles */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" as const, marginBottom: 8 }}>
            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              if (!meta) return null;
              const count = categoryGroups.find((c) => c.category === cat)?._count.id ?? 0;
              return (
                <div key={cat} style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  backgroundColor: meta.circle,
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  justifyContent: "center",
                  color: ["enfant", "famille", "initié"].includes(cat) ? "#111" : "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  textTransform: "uppercase" as const,
                  letterSpacing: 0.5,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}>
                  <span style={{ fontSize: 20, marginBottom: 2 }}>{meta.icon}</span>
                  {meta.label}
                  {count > 0 && <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, marginTop: 1 }}>{count} jeux</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Rules box — from the physical sign */}
        <div style={{ backgroundColor: "#fefce8", border: "2px solid #fde68a", borderRadius: 16, padding: "28px 32px", marginBottom: 48 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#92400e", margin: "0 0 16px", textDecoration: "underline" }}>
            📋 Merci de respecter les règles suivantes&nbsp;:
          </h2>
          <ul style={{ paddingLeft: 22, margin: 0, color: "#78350f", fontSize: 15, lineHeight: 2.2 }}>
            <li><strong style={{ color: "#C8102E" }}>Quand j'emprunte un jeu,</strong> j'indique mon matricule et la date d'emprunt en face du jeu correspondant.</li>
            <li><strong style={{ color: "#C8102E" }}>Quand je rends un jeu,</strong> j'efface mon matricule et la date d'emprunt en face du jeu correspondant.</li>
            <li>J'emprunte <strong style={{ textDecoration: "underline" }}>5 jeux maximum</strong> en même temps.</li>
            <li>J'emprunte les jeux pour <strong style={{ textDecoration: "underline" }}>4 semaines maximum</strong>.</li>
            <li>Je rends les jeux empruntés complets et je les range dans l'armoire correspondante en fonction de sa couleur (gommette).</li>
          </ul>
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 16, marginBottom: 0 }}>
            En cas de problème (pièces manquantes ou détériorées, perte du jeu...) utilisez le bouton <strong>"Signaler un problème"</strong> sur la fiche du jeu.
          </p>
        </div>

        {/* Steps */}
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 24px" }}>Comment ça marche ?</h2>
        <div style={{ marginBottom: 56 }}>
          {[
            {
              num: 1, color: "#C8102E", bg: "#fff0f0",
              title: "Créez votre compte",
              text: "Inscrivez-vous sur ludigest.fr avec votre adresse email professionnelle. Renseignez votre nom, prénom, matricule (5 chiffres) et le site où vous travaillez. Un email de confirmation active votre compte.",
            },
            {
              num: 2, color: "#2563eb", bg: "#eff6ff",
              title: "Choisissez un jeu",
              text: "Parcourez le catalogue dans la section Jeux. Filtrez par catégorie, nombre de joueurs ou durée de partie. Sur mobile, scannez directement le code-barres d'une boîte pour accéder à sa fiche.",
            },
            {
              num: 3, color: "#16a34a", bg: "#f0fdf4",
              title: "Empruntez pour 4 semaines",
              text: "Cliquez sur « Emprunter ce jeu » sur la fiche d'un jeu disponible. La durée d'emprunt est de 4 semaines, 5 jeux maximum en même temps. Vous pouvez prolonger deux fois d'une semaine supplémentaire. Récupérez la boîte auprès du référent de votre site.",
            },
            {
              num: 4, color: "#ea580c", bg: "#fff7ed",
              title: "Rendez le jeu à temps",
              text: "Remettez la boîte au référent avant la date de retour affichée dans votre profil. Vous recevrez un rappel automatique 2 jours avant l'échéance. En cas de retard, une relance est envoyée tous les 3 jours.",
            },
          ].map(({ num, color, bg, title, text }) => (
            <div key={num} style={{ display: "flex", gap: 20, marginBottom: 20, backgroundColor: bg, borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", backgroundColor: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
                {num}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#4b5563", margin: 0, lineHeight: 1.7 }}>{text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Catalogue */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
            Le catalogue — <span style={{ color: "#C8102E" }}>{totalGames} jeux</span>
          </h2>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 0, marginBottom: 24 }}>
            Répartis en {categoryGroups.length} catégories dans les ludothèques CSEM BRED.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {sortedCategories.map(({ category, _count }) => {
              const meta = CATEGORY_META[category] ?? { label: category, color: "#111", bg: "#f3f4f6", icon: "🎲", circle: "#6b7280" };
              const isDark = ["ambiance", "escape", "expert"].includes(category);
              return (
                <div key={category} style={{
                  backgroundColor: meta.circle,
                  borderRadius: 14,
                  padding: "18px 12px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{meta.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: isDark ? "#fff" : "#111", marginBottom: 2 }}>{meta.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? "#fff" : "#111" }}>{_count.id}</div>
                  <div style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.75)" : "#9ca3af" }}>{_count.id > 1 ? "jeux" : "jeu"}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scanner */}
        <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 16, padding: "24px 28px", marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8 }}>
            📷 Scanner un code-barres
          </h2>
          <p style={{ fontSize: 14, color: "#075985", margin: "0 0 10px", lineHeight: 1.7 }}>
            Sur la page Jeux, l'icône caméra permet de scanner le code-barres d'une boîte pour accéder directement à sa fiche.
            Votre navigateur demandera l'accès à la caméra la première fois. Aucune image n'est enregistrée.
          </p>
          <p style={{ fontSize: 13, color: "#0369a1", margin: 0 }}>
            Compatible avec tous les smartphones modernes (Chrome, Safari, Firefox).
          </p>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 24, borderTop: "1px solid #e5e7eb", display: "flex", gap: 24, flexWrap: "wrap" as const, alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>© 2026 LudiGest — CSEM BRED Banque Populaire</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="/confidentialite" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Politique de confidentialité</a>
            <a href="/login" style={{ fontSize: 13, color: "#C8102E", fontWeight: 600, textDecoration: "none" }}>Se connecter →</a>
          </div>
        </div>
      </div>
    </main>
  );
}

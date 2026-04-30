import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comment ça marche — LudiGest" };

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  escape:   { label: "Escape",   color: "#7c3aed", bg: "#ede9fe", icon: "🔐" },
  famille:  { label: "Famille",  color: "#ea580c", bg: "#ffedd5", icon: "👨‍👩‍👧‍👦" },
  ambiance: { label: "Ambiance", color: "#2563eb", bg: "#dbeafe", icon: "🎉" },
  enfant:   { label: "Enfant",   color: "#d97706", bg: "#fef3c7", icon: "🧸" },
  "initié": { label: "Initié",   color: "#475569", bg: "#f1f5f9", icon: "🧠" },
  expert:   { label: "Expert",   color: "#16a34a", bg: "#dcfce7", icon: "🏆" },
};

export default async function CommentCaMarchePage() {
  const [categoryGroups, totalGames] = await Promise.all([
    prisma.game.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { status: { not: "SUSPENDED" } },
    }),
    prisma.game.count({ where: { status: { not: "SUSPENDED" } } }),
  ]);

  return (
    <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a1a1a" }}>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "#C8102E", color: "#fff", fontWeight: 700, fontSize: 12, padding: "5px 14px", borderRadius: 20, marginBottom: 20, letterSpacing: 1.5, textTransform: "uppercase" }}>
          🎲 LudiGest
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#111", margin: "0 0 12px", lineHeight: 1.15 }}>
          Comment ça marche ?
        </h1>
        <p style={{ fontSize: 17, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
          La ludothèque BRED est gratuite et accessible à tous les collaborateurs.<br />
          Empruntez un jeu en quelques clics depuis votre ordinateur ou votre smartphone.
        </p>
      </div>

      {/* Steps */}
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
            text: "Cliquez sur « Emprunter ce jeu » sur la fiche d'un jeu disponible. La durée d'emprunt est de 4 semaines. Vous pouvez prolonger deux fois d'une semaine supplémentaire si personne d'autre ne le réserve. Récupérez la boîte auprès du référent de votre site.",
          },
          {
            num: 4, color: "#ea580c", bg: "#fff7ed",
            title: "Rendez le jeu à temps",
            text: "Remettez la boîte au référent avant la date de retour affichée dans votre profil. Vous recevrez un rappel automatique 2 jours avant l'échéance. En cas de retard, une relance est envoyée tous les 3 jours.",
          },
        ].map(({ num, color, bg, title, text }) => (
          <div key={num} style={{ display: "flex", gap: 20, marginBottom: 28, backgroundColor: bg, borderRadius: 16, padding: "20px 24px" }}>
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
      <div style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
          Le catalogue — <span style={{ color: "#C8102E" }}>{totalGames} jeux</span>
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 0, marginBottom: 24 }}>
          Répartis en {categoryGroups.length} catégories dans les ludothèques BRED.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {categoryGroups
            .sort((a, b) => b._count.id - a._count.id)
            .map(({ category, _count }) => {
              const meta = CATEGORY_META[category] ?? { label: category, color: "#6b7280", bg: "#f3f4f6", icon: "🎲" };
              return (
                <div key={category} style={{ backgroundColor: meta.bg, borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{meta.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: meta.color, marginBottom: 2 }}>{meta.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{_count.id}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{_count.id > 1 ? "jeux" : "jeu"}</div>
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

      {/* Rules */}
      <div style={{ backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: 16, padding: "24px 28px", marginBottom: 48 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#92400e", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
          📋 Règles d'utilisation
        </h2>
        <ul style={{ paddingLeft: 20, margin: 0, color: "#78350f", fontSize: 14, lineHeight: 2 }}>
          <li>Un seul jeu emprunté à la fois par personne.</li>
          <li>Durée d'emprunt : <strong>4 semaines</strong> — prolongeable 2× d'une semaine.</li>
          <li>Les jeux doivent être rendus en bon état, avec toutes leurs pièces.</li>
          <li>En cas de perte ou dégradation, contacter le référent ludothèque.</li>
          <li>Service réservé aux collaborateurs BRED Banque Populaire.</li>
        </ul>
      </div>

      {/* Footer */}
      <div style={{ paddingTop: 24, borderTop: "1px solid #e5e7eb", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "#9ca3af" }}>© 2026 LudiGest — BRED Banque Populaire</span>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/confidentialite" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Politique de confidentialité</a>
          <a href="/login" style={{ fontSize: 13, color: "#C8102E", fontWeight: 600, textDecoration: "none" }}>Se connecter →</a>
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: "Comment ça marche — LudiGest",
};

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 20, marginBottom: 32 }}>
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", backgroundColor: "#C8102E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", fontWeight: 700, fontSize: 16 }}>
        {num}
      </div>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "sans-serif", color: "#111", margin: "0 0 8px" }}>{title}</h3>
        <div style={{ color: "#374151", lineHeight: 1.8 }}>{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "sans-serif", color: "#111", borderBottom: "2px solid #C8102E", paddingBottom: 10, marginBottom: 24 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CommentCaMarchePage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "Georgia, serif", color: "#1a1a1a", lineHeight: 1.8 }}>
      <div style={{ marginBottom: 40 }}>
        <span style={{ display: "inline-block", backgroundColor: "#C8102E", color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 4, marginBottom: 16, letterSpacing: 1 }}>
          LUDIGEST
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 700, fontFamily: "sans-serif", color: "#111", margin: "0 0 8px" }}>
          Comment ça marche ?
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280", fontFamily: "sans-serif", margin: 0 }}>
          Tout ce qu'il faut savoir pour utiliser la ludothèque BRED.
        </p>
      </div>

      <Section title="La ludothèque BRED">
        <p>
          La ludothèque BRED est un service gratuit mis à disposition des collaborateurs de la BRED Banque Populaire.
          Elle propose une sélection de jeux de société disponibles à l'emprunt dans plusieurs sites.
        </p>
        <p>
          LudiGest est l'application qui permet de consulter le catalogue, d'emprunter un jeu et de suivre vos emprunts en cours,
          depuis un ordinateur ou un smartphone.
        </p>
      </Section>

      <Section title="Emprunter un jeu">
        <Step num={1} title="Créez votre compte">
          <p>
            Inscrivez-vous sur <strong>ludigest.fr</strong> avec votre adresse email professionnelle.
            Renseignez votre nom, prénom, matricule et le site où vous travaillez.
            Un email de confirmation vous sera envoyé — cliquez sur le lien pour activer votre compte.
          </p>
        </Step>
        <Step num={2} title="Trouvez un jeu">
          <p>
            Parcourez le catalogue depuis la page <strong>Jeux</strong>.
            Vous pouvez filtrer par catégorie, nombre de joueurs ou durée de partie.
            Sur mobile, utilisez le bouton Scanner pour identifier directement un jeu par son code-barres.
          </p>
        </Step>
        <Step num={3} title="Empruntez">
          <p>
            Sur la fiche d'un jeu disponible, cliquez sur <strong>Emprunter ce jeu</strong>.
            La durée standard d'un emprunt est de <strong>14 jours</strong>.
            Récupérez physiquement la boîte auprès du référent ludothèque de votre site.
          </p>
        </Step>
        <Step num={4} title="Rendez le jeu">
          <p>
            Remettez la boîte au référent ludothèque avant la date de retour affichée dans votre profil.
            Le référent enregistrera le retour dans l'application.
            En cas d'oubli, vous recevrez un email de rappel automatique.
          </p>
        </Step>
      </Section>

      <Section title="Scanner un code-barres">
        <p>
          L'application propose deux façons d'utiliser le scanner :
        </p>
        <ul style={{ paddingLeft: 20, margin: "12px 0" }}>
          <li style={{ marginBottom: 8 }}>
            <strong>Recherche rapide</strong> — depuis la page Jeux, cliquez sur l'icône caméra pour scanner
            le code-barres d'une boîte et accéder directement à sa fiche.
          </li>
          <li>
            <strong>Application mobile</strong> — l'application Android (disponible en interne) intègre le même scanner
            pour une expérience optimale sur smartphone.
          </li>
        </ul>
        <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "sans-serif" }}>
          Le scanner utilise la caméra de votre appareil. Votre navigateur vous demandera l'autorisation la première fois.
          Aucune image n'est enregistrée ou transmise.
        </p>
      </Section>

      <Section title="Règles d'utilisation">
        <ul style={{ paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>Un seul jeu emprunté à la fois par personne.</li>
          <li style={{ marginBottom: 8 }}>Durée maximale : 14 jours. Un rappel par email est envoyé à J-2.</li>
          <li style={{ marginBottom: 8 }}>Les jeux doivent être rendus en bon état, avec toutes leurs pièces.</li>
          <li style={{ marginBottom: 8 }}>En cas de perte ou dégradation, contacter le référent ludothèque de votre site.</li>
          <li>Le service est réservé aux collaborateurs de la BRED Banque Populaire.</li>
        </ul>
      </Section>

      <Section title="Contacter le référent">
        <p>
          Chaque site dispose d'un référent ludothèque qui gère les boîtes physiques et peut répondre à vos questions.
          Pour tout problème avec votre compte ou un emprunt, vous pouvez également contacter l'administrateur via
          l'adresse affichée dans l'application.
        </p>
      </Section>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e5e7eb", fontFamily: "sans-serif", fontSize: 13, color: "#9ca3af", display: "flex", gap: 24, flexWrap: "wrap" }}>
        <a href="/confidentialite" style={{ color: "#6b7280", textDecoration: "none" }}>Politique de confidentialité</a>
        <a href="/login" style={{ color: "#C8102E", textDecoration: "none" }}>Se connecter</a>
      </div>
    </main>
  );
}

export const metadata = {
  title: "Politique de confidentialité — LudiGest",
};

export default function ConfidentialitePage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "Georgia, serif", color: "#1a1a1a", lineHeight: 1.8 }}>
      <div style={{ marginBottom: 40 }}>
        <span style={{ display: "inline-block", backgroundColor: "#C8102E", color: "#fff", fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, padding: "4px 12px", borderRadius: 4, marginBottom: 16, letterSpacing: 1 }}>
          LUDIGEST
        </span>
        <h1 style={{ fontSize: 32, fontWeight: 700, fontFamily: "sans-serif", color: "#111", margin: "0 0 8px" }}>
          Politique de confidentialité
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", fontFamily: "sans-serif", margin: 0 }}>
          Dernière mise à jour : 28 avril 2026
        </p>
      </div>

      <Section title="1. Présentation de l'application">
        <p>
          LudiGest est une application de gestion de ludothèque destinée exclusivement aux collaborateurs
          de la BRED Banque Populaire. Elle permet de consulter le catalogue de jeux de société,
          de gérer les emprunts et de scanner les codes-barres des boîtes de jeux.
        </p>
        <p>
          L'application est éditée par la BRED Banque Populaire (ci-après « BRED »),
          18 quai de la Rapée, 75012 Paris.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <p>Lors de votre inscription et utilisation de l'application, les données suivantes sont collectées :</p>
        <Table rows={[
          ["Prénom et nom", "Identification de l'utilisateur"],
          ["Adresse email professionnelle", "Authentification et communications"],
          ["Matricule BRED", "Vérification de l'appartenance à la BRED"],
          ["Ludothèque sélectionnée", "Affichage du catalogue local"],
          ["Historique des emprunts", "Gestion des prêts de jeux"],
        ]} />
      </Section>

      <Section title="3. Utilisation de la caméra">
        <p>
          L'application demande l'accès à la caméra de votre appareil <strong>uniquement</strong> pour
          scanner les codes-barres (EAN) des boîtes de jeux de société, afin de les identifier
          automatiquement dans le catalogue.
        </p>
        <ul>
          <li>Aucune photo n'est prise, enregistrée ni transmise.</li>
          <li>La caméra n'est activée qu'à la demande explicite de l'utilisateur (bouton de scan).</li>
          <li>Aucune image n'est stockée sur nos serveurs.</li>
        </ul>
      </Section>

      <Section title="4. Finalité du traitement">
        <p>Les données collectées sont utilisées exclusivement pour :</p>
        <ul>
          <li>Permettre la connexion à l'application ;</li>
          <li>Afficher le catalogue de jeux correspondant à votre ludothèque ;</li>
          <li>Enregistrer et suivre les emprunts de jeux ;</li>
          <li>Envoyer les confirmations et notifications liées aux emprunts.</li>
        </ul>
        <p>
          Aucune donnée n'est utilisée à des fins commerciales, publicitaires ou analytiques.
        </p>
      </Section>

      <Section title="5. Conservation des données">
        <p>
          Vos données sont conservées pendant toute la durée de votre activité au sein de la BRED.
          À la cessation de votre activité professionnelle, votre compte et les données associées
          sont supprimés dans un délai de 90 jours.
        </p>
      </Section>

      <Section title="6. Partage des données">
        <p>
          Vos données personnelles ne sont ni vendues, ni louées, ni partagées avec des tiers
          à des fins commerciales. L'accès aux données est strictement limité aux administrateurs
          de la ludothèque BRED.
        </p>
      </Section>

      <Section title="7. Hébergement">
        <p>
          L'application et ses données sont hébergées sur des serveurs sécurisés situés en Europe.
          Les données de connexion sont protégées par chiffrement (HTTPS/TLS).
          Les mots de passe sont stockés sous forme hachée et ne sont jamais lisibles.
        </p>
      </Section>

      <Section title="8. Vos droits">
        <p>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
        </p>
        <ul>
          <li><strong>Droit d'accès</strong> : obtenir une copie de vos données ;</li>
          <li><strong>Droit de rectification</strong> : corriger des données inexactes ;</li>
          <li><strong>Droit à l'effacement</strong> : demander la suppression de votre compte ;</li>
          <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez l'administrateur de l'application à l'adresse :
          {" "}<a href="mailto:admin@ludigest.fr" style={{ color: "#C8102E" }}>admin@ludigest.fr</a>
        </p>
      </Section>

      <Section title="9. Modifications">
        <p>
          Cette politique de confidentialité peut être mise à jour. Toute modification sera
          notifiée via l'application. La date de dernière mise à jour est indiquée en haut de cette page.
        </p>
      </Section>

      <footer style={{ marginTop: 56, paddingTop: 24, borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#9ca3af", fontFamily: "sans-serif", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <span>© {new Date().getFullYear()} LudiGest — BRED Banque Populaire. Tous droits réservés.</span>
        <a href="/comment-ca-marche" style={{ color: "#C8102E", textDecoration: "none", fontWeight: 600 }}>
          Comment ça marche ?
        </a>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "sans-serif", color: "#111", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #C8102E", display: "inline-block" }}>
        {title}
      </h2>
      <div style={{ fontSize: 16 }}>{children}</div>
    </section>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15, marginTop: 12 }}>
      <thead>
        <tr style={{ backgroundColor: "#f9fafb" }}>
          <th style={{ textAlign: "left", padding: "10px 14px", fontFamily: "sans-serif", fontSize: 13, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Donnée</th>
          <th style={{ textAlign: "left", padding: "10px 14px", fontFamily: "sans-serif", fontSize: 13, color: "#6b7280", fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Finalité</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([data, purpose], i) => (
          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
            <td style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontWeight: 500 }}>{data}</td>
            <td style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>{purpose}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

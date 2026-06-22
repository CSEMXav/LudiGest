import Image from "next/image";

const APK_URL = "https://www.ludigest.fr/ludigest.apk";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(APK_URL)}`;

export const metadata = {
  title: "Installer LudiGest",
  description: "Application mobile LudiGest — Android & iPhone",
};

function SafariShareIllustration() {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#ece1cd] bg-[#f2f2f7]">
      {/* Fausse barre de statut */}
      <div className="bg-[#f2f2f7] px-4 pt-3 pb-1 flex justify-between items-center">
        <span className="text-xs text-gray-500 font-medium">9:41</span>
        <div className="flex gap-1 items-center">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="4" width="3" height="8" rx="1" fill="#1c1c1e"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill="#1c1c1e"/><rect x="9" y="0.5" width="3" height="11.5" rx="1" fill="#1c1c1e"/><rect x="13.5" y="0" width="2.5" height="12" rx="1" fill="#d1d1d6"/></svg>
          <svg width="16" height="12" viewBox="0 0 24 12" fill="none"><rect x="0.5" y="0.5" width="20" height="11" rx="3.5" stroke="#1c1c1e" strokeOpacity="0.35"/><rect x="1" y="1" width="16" height="10" rx="3" fill="#1c1c1e"/><path d="M22 4.5v3a1.5 1.5 0 000-3z" fill="#1c1c1e" fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Fausse barre d'adresse Safari */}
      <div className="bg-[#f2f2f7] px-3 pb-2">
        <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
          <span className="text-xs text-gray-400 flex-1">ludigest.fr</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
        </div>
      </div>

      {/* Faux contenu de page */}
      <div className="bg-white mx-3 rounded-xl p-4 mb-3 min-h-[80px] flex items-center justify-center">
        <span className="text-gray-300 text-sm">ludigest.fr</span>
      </div>

      {/* Fausse barre Safari du bas avec bouton Partager mis en évidence */}
      <div className="bg-[#f2f2f7] border-t border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center">
          {/* ← */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          {/* → */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d1d6" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>

          {/* Bouton Partager — mis en évidence */}
          <div className="relative flex flex-col items-center">
            <div className="absolute -inset-3 rounded-2xl bg-[#C8102E] opacity-20 animate-pulse" />
            <div className="relative bg-[#C8102E] rounded-xl p-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
            </div>
            <span className="text-[10px] font-bold text-[#C8102E] mt-1">Appuyez ici</span>
          </div>

          {/* Bookmarks */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          {/* Tabs */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
        </div>
      </div>

      <div className="bg-[#f2f2f7] pb-4 px-3">
        <div className="bg-white rounded-2xl p-3 text-center">
          <p className="text-xs text-gray-500 font-medium">
            Puis dans le menu qui s&apos;ouvre, faites défiler et appuyez sur
          </p>
          <p className="text-sm font-bold text-[#007AFF] mt-1">
            &ldquo;Sur l&apos;écran d&apos;accueil&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#fef9f0] px-4 py-12">
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-1 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-[#C8102E] flex items-center justify-center mb-1">
            <span className="text-white text-3xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1e1610]">Installer LudiGest</h1>
          <p className="text-sm text-gray-400">Ludothèque BRED — Android &amp; iPhone</p>
        </div>

        {/* ── ANDROID ── */}
        <div className="bg-white rounded-3xl border border-[#ece1cd] p-7 flex flex-col items-center gap-5 shadow-sm">
          <div className="flex items-center gap-2 self-start">
            <span className="text-2xl">🤖</span>
            <h2 className="text-lg font-bold text-[#1e1610]">Android</h2>
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Application native</span>
          </div>

          <Image
            src={QR_URL}
            alt="QR code téléchargement LudiGest Android"
            width={200}
            height={200}
            className="rounded-xl border border-[#ece1cd]"
            unoptimized
          />

          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Scannez le QR code ou appuyez sur le bouton pour télécharger l&apos;APK.
          </p>

          <a
            href="/ludigest.apk"
            download="ludigest.apk"
            className="w-full bg-[#C8102E] text-white text-center font-semibold py-3 px-6 rounded-xl hover:bg-[#a50d26] transition-colors"
          >
            ⬇ Télécharger l&apos;APK
          </a>

          <div className="w-full bg-[#fef9f0] border border-[#ece1cd] rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
            <p className="font-semibold text-[#1e1610] mb-2">📋 Instructions</p>
            <p>1. Téléchargez l&apos;APK</p>
            <p>2. Ouvrez le fichier téléchargé</p>
            <p>3. Si demandé : <strong>Paramètres → Installer des applis inconnues → Autoriser</strong></p>
            <p>4. Appuyez sur <strong>Installer</strong></p>
          </div>
        </div>

        {/* ── IPHONE / PWA ── */}
        <div className="bg-white rounded-3xl border border-[#ece1cd] p-7 flex flex-col gap-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍎</span>
            <h2 className="text-lg font-bold text-[#1e1610]">iPhone</h2>
            <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">PWA — via Safari</span>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed">
            Sur iPhone, ouvrez <strong>ludigest.fr</strong> dans <strong>Safari</strong> puis ajoutez-le à votre écran d&apos;accueil en suivant ces étapes :
          </p>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">1</div>
              <p>Ouvrez <strong>Safari</strong> et allez sur <strong className="text-[#C8102E]">ludigest.fr</strong></p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">2</div>
              <p>Appuyez sur le bouton <strong>Partager</strong> dans la barre du bas (icône carré avec une flèche vers le haut)</p>
            </div>
          </div>

          <SafariShareIllustration />

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">3</div>
              <p>Dans le menu, faites défiler et appuyez sur <strong>&ldquo;Sur l&apos;écran d&apos;accueil&rdquo;</strong></p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#C8102E] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">4</div>
              <p>Appuyez sur <strong>Ajouter</strong> en haut à droite</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
            <strong>⚠ Important :</strong> utilisez obligatoirement <strong>Safari</strong> — Chrome et Firefox ne permettent pas d&apos;ajouter à l&apos;écran d&apos;accueil sur iPhone.
          </div>
        </div>

        <p className="text-xs text-gray-300 text-center pb-4">Accès réservé aux collaborateurs @bred.fr</p>
      </div>
    </main>
  );
}

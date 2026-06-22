import Image from "next/image";

const APK_URL = "https://www.ludigest.fr/ludigest.apk";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(APK_URL)}`;

export const metadata = {
  title: "Télécharger LudiGest",
  description: "Application mobile LudiGest — ludothèque BRED",
};

export default function DownloadPage() {
  return (
    <main className="min-h-screen bg-[#fef9f0] flex flex-col items-center justify-center px-4 py-16">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-sm w-full flex flex-col items-center gap-6 border border-[#ece1cd]">

        <div className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-2xl bg-[#C8102E] flex items-center justify-center mb-1">
            <span className="text-white text-3xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1e1610]">LudiGest</h1>
          <p className="text-sm text-gray-400">Ludothèque BRED — Application Android</p>
        </div>

        <Image
          src={QR_URL}
          alt="QR code téléchargement LudiGest"
          width={220}
          height={220}
          className="rounded-xl border border-[#ece1cd]"
          unoptimized
        />

        <p className="text-sm text-gray-500 text-center leading-relaxed">
          Scannez le QR code ou appuyez sur le bouton ci-dessous pour télécharger l&apos;application.
        </p>

        <a
          href="/ludigest.apk"
          download="ludigest.apk"
          className="w-full bg-[#C8102E] text-white text-center font-semibold py-3 px-6 rounded-xl hover:bg-[#a50d26] transition-colors"
        >
          ⬇ Télécharger l&apos;APK
        </a>

        <div className="w-full bg-[#fef9f0] border border-[#ece1cd] rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-[#1e1610] mb-2">📋 Instructions d&apos;installation</p>
          <p>1. Téléchargez l&apos;APK en appuyant sur le bouton</p>
          <p>2. Ouvrez le fichier téléchargé</p>
          <p>3. Si demandé : <strong>Paramètres → Installer des applis inconnues → Autoriser</strong></p>
          <p>4. Appuyez sur <strong>Installer</strong></p>
        </div>

        <p className="text-xs text-gray-300">Accès réservé aux collaborateurs @bred.fr</p>
      </div>
    </main>
  );
}

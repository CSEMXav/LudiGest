"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ProposalsBoard } from "@/components/ProposalsBoard";

interface WindowDTO {
  opensAt: string | null;
  closesAt: string | null;
  opensAtLocal: string | null;
  closesAtLocal: string | null;
  isOpen: boolean;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function statusOf(w: WindowDTO): { label: string; className: string } {
  if (w.isOpen) {
    return {
      label: w.closesAt ? `Ouverte aux membres jusqu'au ${formatDateTime(w.closesAt)}` : "Ouverte aux membres (sans date de fermeture)",
      className: "bg-green-100 text-green-700",
    };
  }
  if (w.opensAt && new Date(w.opensAt) > new Date()) {
    return { label: `Ouverture aux membres le ${formatDateTime(w.opensAt)}`, className: "bg-blue-100 text-blue-700" };
  }
  if (w.closesAt) return { label: `Fermée aux membres depuis le ${formatDateTime(w.closesAt)}`, className: "bg-gray-100 text-gray-600" };
  return { label: "Visible uniquement par les administrateurs", className: "bg-gray-100 text-gray-600" };
}

function OpeningSettings() {
  const [current, setCurrent] = useState<WindowDTO | null>(null);
  const [opensDate, setOpensDate] = useState("");
  const [opensTime, setOpensTime] = useState("");
  const [closesDate, setClosesDate] = useState("");
  const [closesTime, setClosesTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function apply(w: WindowDTO) {
    setCurrent(w);
    setOpensDate(w.opensAtLocal?.slice(0, 10) ?? "");
    setOpensTime(w.opensAtLocal?.slice(11, 16) ?? "");
    setClosesDate(w.closesAtLocal?.slice(0, 10) ?? "");
    setClosesTime(w.closesAtLocal?.slice(11, 16) ?? "");
  }

  useEffect(() => {
    fetch("/api/proposals/settings")
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) apply(d); else setError(d?.error ?? "Erreur de chargement."); })
      .catch(() => setError("Erreur de chargement."));
  }, []);

  async function save(clear = false) {
    setError("");
    setMsg("");
    if (!clear && ((opensDate && !opensTime) || (closesDate && !closesTime) || (!opensDate && opensTime) || (!closesDate && closesTime))) {
      setError("Renseignez à la fois la date et l'heure.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/proposals/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opensAt: clear || !opensDate ? null : `${opensDate}T${opensTime}`,
          closesAt: clear || !closesDate ? null : `${closesDate}T${closesTime}`,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur lors de l'enregistrement."); return; }
      apply(d);
      setMsg("✓ Période enregistrée");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  const status = current ? statusOf(current) : null;
  const inputClass = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900">Ouverture aux membres</h2>
        {status && <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.className}`}>{status.label}</span>}
      </div>
      <p className="text-sm text-gray-500">
        La page « Futurs achats » apparaît dans le menu des membres à partir de la date d&apos;ouverture et disparaît à la date de fermeture (heure de Paris). Les administrateurs y ont toujours accès ici.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Ouverture — date et heure</label>
          <div className="flex gap-2">
            <input type="date" aria-label="Date d'ouverture" value={opensDate} onChange={(e) => setOpensDate(e.target.value)} className={`flex-1 ${inputClass}`} />
            <input type="time" aria-label="Heure d'ouverture" value={opensTime} onChange={(e) => setOpensTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fermeture — date et heure</label>
          <div className="flex gap-2">
            <input type="date" aria-label="Date de fermeture" value={closesDate} min={opensDate || undefined} onChange={(e) => setClosesDate(e.target.value)} className={`flex-1 ${inputClass}`} />
            <input type="time" aria-label="Heure de fermeture" value={closesTime} onChange={(e) => setClosesTime(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={() => save()}
          disabled={saving || !current}
          className="px-5 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement..." : "Enregistrer la période"}
        </button>
        {current?.opensAt && (
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Effacer les dates (page masquée)
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminProposalsPage() {
  // Les dates et la liste sont propres à chaque ludothèque : on recharge au changement de site
  const { data: session } = useSession();
  const location = session?.user.location;
  return (
    <>
      <OpeningSettings key={`settings-${location}`} />
      <ProposalsBoard key={`board-${location}`} />
    </>
  );
}

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

function AnnounceEmail({ isOpen }: { isOpen: boolean }) {
  const [busy, setBusy] = useState<"" | "preview" | "test" | "send">("");
  const [preview, setPreview] = useState<{ subject: string; html: string; recipients: number; alreadyNotified: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Nombre de membres restant à prévenir (ceux qui ont déjà reçu l'email ne le reçoivent pas deux fois)
  function refreshCounts() {
    if (!isOpen) return;
    fetch("/api/proposals/announce", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "preview" }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPreview(d); })
      .catch(() => {});
  }
  useEffect(refreshCounts, [isOpen]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function call(mode: "preview" | "test" | "send") {
    setBusy(mode); setError(""); setMsg("");
    try {
      const res = await fetch("/api/proposals/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur lors de l'envoi."); return; }
      if (mode === "preview") { setPreview(d); setShowPreview(true); }
      else if (mode === "test") setMsg("✓ Email de test envoyé à " + d.sentTo);
      else {
        if (d.failed > 0) setError(`${d.failed} email(s) n'ont pas pu être envoyés. Cliquez à nouveau sur « Envoyer » pour les membres restants.`);
        setMsg(`✓ Email envoyé à ${d.emailsSent} membre(s) sur ${d.recipients}`);
        refreshCounts();
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(""); setConfirming(false);
    }
  }

  const secondary = "px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors";

  return (
    <div className="pt-4 border-t border-gray-100 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900 text-sm">📧 Prévenir les membres par email</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          {isOpen
            ? "Envoie aux membres de cette ludothèque un email les invitant à proposer des jeux et à voter jusqu'à la date de fermeture. Un membre déjà prévenu pour cette période ne le reçoit pas une seconde fois."
            : "Disponible lorsque la page est ouverte aux membres (période d'ouverture en cours)."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => call("preview")} disabled={!isOpen || !!busy} className={secondary}>
          {busy === "preview" ? "…" : "👁 Aperçu"}
        </button>
        <button onClick={() => call("test")} disabled={!isOpen || !!busy} className={secondary}>
          {busy === "test" ? "Envoi…" : "✉️ M'envoyer un test"}
        </button>
        <button
          onClick={() => setConfirming(true)}
          disabled={!isOpen || !!busy || preview?.recipients === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {busy === "send" ? "Envoi en cours… (jusqu'à 30 s)"
            : preview && preview.alreadyNotified > 0 ? `📧 Envoyer aux ${preview.recipients} membre(s) restant(s)`
            : "📧 Envoyer à tous les membres"}
        </button>
      </div>
      {isOpen && preview && (
        <p className="text-xs text-gray-500">
          {preview.alreadyNotified} membre(s) déjà prévenu(s) pour cette période · {preview.recipients} restant(s) à prévenir.
        </p>
      )}
      {confirming && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200">
          <span className="flex-1 font-medium text-gray-900">
            Envoyer l&apos;email d&apos;information à {preview ? `${preview.recipients} membre(s)` : "tous les membres de cette ludothèque"} ?
          </span>
          <button onClick={() => setConfirming(false)} className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 text-gray-700">Non</button>
          <button onClick={() => call("send")} className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#C8102E]">Oui, envoyer</button>
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
      {preview && showPreview && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 text-sm bg-gray-50 border-b border-gray-200">
            <span className="flex-1 truncate text-gray-900"><strong>Objet :</strong> {preview.subject} — {preview.recipients} destinataire(s)</span>
            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <iframe title="Aperçu de l'email" srcDoc={preview.html} className="w-full" style={{ height: 480, border: "none", background: "#fff" }} />
        </div>
      )}
    </div>
  );
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
      <AnnounceEmail isOpen={!!current?.isOpen} />
    </div>
  );
}

interface ArchivedProposal {
  id: string;
  title: string;
  category: string;
  link: string | null;
  proposedBy: string;
  upVotes: number;
  downVotes: number;
  inLibrary: { id: string; name: string } | null;
}
interface ArchiveDTO {
  id: string;
  name: string;
  archivedAt: string;
  opensAt: string | null;
  closesAt: string | null;
  proposals: ArchivedProposal[];
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

function Archives({ onArchived }: { onArchived: () => void }) {
  const [archives, setArchives] = useState<ArchiveDTO[]>([]);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/proposals/archive")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setArchives(Array.isArray(d) ? d : []))
      .catch(() => {});
  }
  useEffect(load, []);

  async function archive() {
    setBusy(true); setError(""); setMsg("");
    try {
      const res = await fetch("/api/proposals/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur lors de l'archivage."); return; }
      setMsg(`✓ ${d.archived} proposition(s) archivée(s) dans « ${d.name} ». La page est remise à zéro.`);
      setName("");
      load();
      onArchived();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false); setConfirming(false);
    }
  }

  async function removeArchive(a: ArchiveDTO) {
    if (!confirm(`Supprimer définitivement l'archive « ${a.name} » ?

Ses ${a.proposals.length} proposition(s) et leurs votes seront perdus. Cette action est irréversible.`)) return;
    setError(""); setMsg("");
    try {
      const res = await fetch(`/api/proposals/archive/${a.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur lors de la suppression."); return; }
      setArchives((list) => list.filter((x) => x.id !== a.id));
      setMsg(`✓ Archive « ${a.name} » supprimée.`);
    } catch {
      setError("Erreur réseau.");
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mt-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Archiver la session</h2>
        <p className="text-sm text-gray-500 mt-1">
          Conserve les propositions en cours et leurs votes dans une archive, puis remet la page à zéro pour une future session : liste vide et dates d&apos;ouverture effacées (la page n&apos;est plus visible des membres).
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Nom de la session (ex : Achats automne 2026)"
          aria-label="Nom de la session à archiver"
          className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        <button
          onClick={() => setConfirming(true)}
          disabled={busy}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          🗄 Archiver et remettre à zéro
        </button>
      </div>
      {confirming && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200">
          <span className="flex-1 font-medium text-gray-900">
            Archiver toutes les propositions en cours et fermer la page aux membres ? Les votes sont conservés dans l&apos;archive.
          </span>
          <button onClick={() => setConfirming(false)} className="px-3 py-1 rounded-full text-xs font-semibold border border-gray-300 text-gray-700">Non</button>
          <button onClick={archive} disabled={busy} className="px-3 py-1 rounded-full text-xs font-bold text-white bg-[#C8102E] disabled:opacity-50">
            {busy ? "Archivage…" : "Oui, archiver"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {msg && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{msg}</p>}

      {archives.length > 0 && (
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm">Sessions archivées</h3>
          {archives.map((a) => (
            <details key={a.id} className="border border-gray-200 rounded-lg">
              <summary className="cursor-pointer px-4 py-2.5 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-gray-900">{a.name}</span>
                <span className="text-xs text-gray-500">
                  {a.proposals.length} proposition{a.proposals.length > 1 ? "s" : ""} · archivée le {formatDay(a.archivedAt)}
                  {a.opensAt ? ` · ouverte du ${formatDay(a.opensAt)}${a.closesAt ? ` au ${formatDay(a.closesAt)}` : ""}` : ""}
                </span>
              </summary>
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Jeu</th>
                      <th className="px-4 py-2 text-right">👍</th>
                      <th className="px-4 py-2 text-right">👎</th>
                      <th className="px-4 py-2 text-left">Proposé par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {a.proposals.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2">
                          {p.link ? (
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-[#C8102E] hover:underline">{p.title}</a>
                          ) : (
                            <span className="font-medium text-gray-900">{p.title}</span>
                          )}
                          {p.inLibrary && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">Déjà à la ludothèque</span>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-green-700">{p.upVotes}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-red-600">{p.downVotes}</td>
                        <td className="px-4 py-2 text-gray-600">{p.proposedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 text-right">
                <button
                  onClick={() => removeArchive(a)}
                  className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Supprimer cette archive
                </button>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminProposalsPage() {
  // Les dates et la liste sont propres à chaque ludothèque : on recharge au changement de site
  const { data: session } = useSession();
  const location = session?.user.location;
  // Après un archivage, la liste et les dates repartent de zéro
  const [generation, setGeneration] = useState(0);
  return (
    <>
      <OpeningSettings key={`settings-${location}-${generation}`} />
      <ProposalsBoard key={`board-${location}-${generation}`} />
      <Archives key={`archives-${location}`} onArchived={() => setGeneration((g) => g + 1)} />
    </>
  );
}

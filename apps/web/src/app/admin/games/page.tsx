"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BarcodeInputScanner } from "@/components/BarcodeInputScanner";
import type { GameDTO, GameCategory } from "@ludigest/types";

const STATUS_LABELS = { AVAILABLE: "Disponible", BORROWED: "Emprunté", SUSPENDED: "Suspendu" };
const CATEGORIES: { value: GameCategory; label: string; color: string }[] = [
  { value: "escape",   label: "Escape",   color: "bg-red-500 text-white"    },
  { value: "famille",  label: "Famille",  color: "bg-orange-400 text-white" },
  { value: "ambiance", label: "Ambiance", color: "bg-blue-500 text-white"   },
  { value: "enfant",   label: "Enfant",   color: "bg-yellow-400 text-white" },
  { value: "initié",   label: "Initié",   color: "bg-gray-500 text-white"   },
  { value: "expert",   label: "Expert",   color: "bg-green-500 text-white"  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

interface EditState {
  name: string;
  category: GameCategory;
  type: string;
  summary: string;
  minPlayers: string;
  maxPlayers: string;
  duration: string;
  minAge: string;
  coverUrl: string;
  barcode: string;
  bggId: string;
  addedAt: string;
}

function EditModal({ game, onClose, onSaved }: { game: GameDTO; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditState>({
    name:       game.name,
    category:   game.category as GameCategory,
    type:       game.type,
    summary:    game.summary ?? "",
    minPlayers: game.minPlayers?.toString() ?? "",
    maxPlayers: game.maxPlayers?.toString() ?? "",
    duration:   game.duration?.toString() ?? "",
    minAge:     game.minAge?.toString() ?? "",
    coverUrl:   game.coverUrl ?? "",
    barcode:    game.barcode ?? "",
    bggId:      game.bggId ?? "",
    addedAt:    game.addedAt.slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [translating, setTranslating] = useState(false);

  async function translateSummary() {
    if (!form.summary.trim()) return;
    setTranslating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/games/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: form.summary }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.text) set("summary", d.text);
      else setError(d.error ?? "Traduction impossible.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setTranslating(false);
    }
  }

  function set(field: keyof EditState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:       form.name,
        category:   form.category,
        type:       form.type,
        summary:    form.summary || null,
        minPlayers: form.minPlayers ? Number(form.minPlayers) : null,
        maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : null,
        duration:   form.duration  ? Number(form.duration)   : null,
        minAge:     form.minAge    ? Number(form.minAge)     : null,
        coverUrl:   form.coverUrl  || null,
        barcode:    form.barcode   || null,
        bggId:      form.bggId     || null,
        addedAt:    form.addedAt,
      }),
    });
    setSaving(false);
    if (res.ok) { onSaved(); onClose(); }
    else { const d = await res.json(); setError(d.error ?? "Erreur lors de la sauvegarde."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Modifier — {game.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Nom + Catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nom</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Catégorie</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value as GameCategory)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 bg-white">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type + Date entrée */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Type (ex : Stratégie)</label>
              <input value={form.type} onChange={(e) => set("type", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date d'entrée</label>
              <input type="date" value={form.addedAt} onChange={(e) => set("addedAt", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>

          {/* Joueurs + Durée + Âge */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Joueurs min</label>
              <input type="number" min="1" value={form.minPlayers} onChange={(e) => set("minPlayers", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Joueurs max</label>
              <input type="number" min="1" value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Durée (min)</label>
              <input type="number" min="1" value={form.duration} onChange={(e) => set("duration", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Âge min</label>
              <input type="number" min="1" value={form.minAge} onChange={(e) => set("minAge", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>

          {/* Résumé */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-500">Résumé</label>
              <button
                type="button"
                onClick={translateSummary}
                disabled={translating || !form.summary.trim()}
                className="text-xs font-medium px-2 py-0.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                title="Traduire le résumé en français"
              >
                {translating ? "Traduction…" : "🇫🇷 Traduire en français"}
              </button>
            </div>
            <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
          </div>

          {/* Image + Code-barre + BGG ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">URL image</label>
            <div className="flex gap-3 items-start">
              <input value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 font-mono text-xs" />
              {form.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.coverUrl}
                  alt="Aperçu"
                  className="w-14 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  onLoad={(e) => { (e.currentTarget as HTMLImageElement).style.display = "block"; }}
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Code-barre</label>
              <div className="flex gap-2">
                <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  title="Scanner avec la caméra"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <line x1="7" y1="8" x2="7" y2="16"/><line x1="10" y1="8" x2="10" y2="16"/>
                    <line x1="13" y1="8" x2="13" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/>
                  </svg>
                </button>
              </div>
            </div>
            {showBarcodeScanner && (
              <BarcodeInputScanner
                onScan={(value) => { set("barcode", value); setShowBarcodeScanner(false); }}
                onClose={() => setShowBarcodeScanner(false)}
              />
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">BGG ID</label>
              <input value={form.bggId} onChange={(e) => set("bggId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-sm bg-[#C8102E] text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickAddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GameCategory | "">("");
  const [bggId, setBggId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; bggFound: boolean } | null>(null);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  async function submit(force = false) {
    if (!name.trim() || !category) return;
    setLoading(true);
    setError("");
    setDuplicate(null);
    const res = await fetch("/api/admin/games/quick-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), category, bggId: bggId.trim() || undefined, force }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.status === 409 && data.canForce) {
      setDuplicate(data.duplicate);
      setError(data.error);
      return;
    }
    if (!res.ok) { setError(data.error ?? "Erreur"); return; }
    setResult(data);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Ajouter un jeu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {result ? (
          <div className="px-6 py-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-900 text-lg mb-1">{result.name}</p>
            <p className="text-sm text-gray-500 mb-6">
              {result.bggFound ? "Infos récupérées depuis BoardGameGeek" : "Jeu créé — infos BGG non trouvées"}
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Fermer
              </button>
              <button onClick={() => { setResult(null); setName(""); setCategory(""); }} className="flex-1 px-4 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700">
                Ajouter un autre
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-500">Les informations seront récupérées automatiquement sur BoardGameGeek.</p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nom du jeu</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ex : Catan, Ticket to Ride..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                URL ou ID BoardGameGeek <span className="font-normal text-gray-400">(optionnel — si la recherche auto échoue)</span>
              </label>
              <input
                value={bggId}
                onChange={(e) => setBggId(e.target.value)}
                placeholder="Ex : 13 ou boardgamegeek.com/boardgame/13/catan"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                      category === c.value
                        ? `${c.color} border-transparent`
                        : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="bg-red-50 rounded-lg px-3 py-2 space-y-2">
                <p className="text-sm text-red-600">{error}</p>
                {duplicate && (
                  <button
                    onClick={() => submit(true)}
                    className="text-xs font-medium text-orange-600 hover:text-orange-800 underline"
                  >
                    Créer quand même en doublon
                  </button>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={() => submit()}
                disabled={loading || !name.trim() || !category}
                className="flex-1 px-4 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Recherche BGG..." : "Valider et ajouter"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_FILTERS: { value: "" | "AVAILABLE" | "BORROWED" | "SUSPENDED"; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "AVAILABLE", label: "Disponible" },
  { value: "BORROWED", label: "Emprunté" },
  { value: "SUSPENDED", label: "Suspendu" },
];

const SORTS: { value: string; label: string }[] = [
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "recent", label: "Plus récents" },
];


function NewGamesEmailModal({ location, onClose }: { location?: string; onClose: () => void }) {
  const [games, setGames] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [onlyLocation, setOnlyLocation] = useState(true);
  const [busy, setBusy] = useState<"" | "preview" | "test" | "send">("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string; recipients: number } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data: GameDTO[]) => {
        const list = (Array.isArray(data) ? data : []).filter((g) => g.status !== "SUSPENDED");
        list.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        setGames(list);
      })
      .catch(() => setError("Erreur de chargement des jeux."))
      .finally(() => setLoading(false));
  }, []);

  const RECENT_DAYS = 30;
  const recentSince = Date.now() - RECENT_DAYS * 86400000;
  const isRecent = (g: GameDTO) => new Date(g.addedAt).getTime() >= recentSince;

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setPreview(null); setMsg("");
  }
  function selectRecent() { setSelected(new Set(games.filter(isRecent).map((g) => g.id))); setPreview(null); }
  function clearSelection() { setSelected(new Set()); setPreview(null); }

  async function call(mode: "preview" | "test" | "send") {
    if (selected.size === 0) { setError("Sélectionnez au moins un jeu."); return; }
    setBusy(mode); setError(""); setMsg("");
    try {
      const res = await fetch("/api/admin/games/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameIds: Array.from(selected), mode, onlyLocation }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Erreur lors de l'envoi."); return; }
      if (mode === "preview") setPreview(d);
      else if (mode === "test") setMsg("✓ Email de test envoyé à " + d.sentTo);
      else setMsg("✓ Annonce envoyée : " + d.emailsSent + " email(s), " + d.pushSent + " push (" + d.recipients + " membre(s))");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(""); setConfirming(false);
    }
  }

  const visible = filter.trim()
    ? games.filter((g) => g.name.toLowerCase().includes(filter.trim().toLowerCase()))
    : games;
  const selectedCount = selected.size;
  const recipientsLabel = preview
    ? preview.recipients + " membre(s)"
    : "tous les membres actifs" + (onlyLocation && location ? " de " + location : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl" style={{ border: "1px solid var(--p-rule)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--p-rule)" }}>
          <div>
            <h2 className="font-semibold" style={{ color: "var(--p-ink)" }}>📧 Annoncer les nouveaux jeux</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>
              Sélectionnez les jeux à présenter dans l&apos;email (triés par date d&apos;entrée). Le texte se paramètre dans <a href="/admin/email-settings" className="underline">Paramètres email</a>.
            </p>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: "var(--p-ink3)" }}>✕</button>
        </div>

        {preview ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-3 px-5 py-3 text-sm" style={{ borderBottom: "1px solid var(--p-rule)", background: "var(--p-bg)" }}>
              <button onClick={() => setPreview(null)} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink2)", background: "#fff" }}>← Retour à la sélection</button>
              <span className="truncate" style={{ color: "var(--p-ink)" }}><strong>Objet :</strong> {preview.subject}</span>
            </div>
            <iframe title="Aperçu de l'email" srcDoc={preview.html} className="flex-1 w-full" style={{ minHeight: 420, border: "none", background: "#fff" }} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid var(--p-rule)" }}>
              <input
                type="search"
                placeholder="Filtrer par nom…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 min-w-[160px] rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }}
              />
              <button onClick={selectRecent} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink2)" }}>
                🆕 {RECENT_DAYS} derniers jours ({games.filter(isRecent).length})
              </button>
              <button onClick={clearSelection} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink2)" }}>Tout désélectionner</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3">
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--p-bg)" }} />)}</div>
              ) : visible.length === 0 ? (
                <p className="text-center py-8 text-sm" style={{ color: "var(--p-ink3)" }}>Aucun jeu.</p>
              ) : (
                <div className="space-y-1.5">
                  {visible.map((g) => {
                    const checked = selected.has(g.id);
                    const meta = [
                      g.minPlayers && g.maxPlayers ? g.minPlayers + "–" + g.maxPlayers + " j." : null,
                      g.duration ? g.duration + " min" : null,
                      g.minAge ? g.minAge + "+" : null,
                    ].filter(Boolean).join(" · ");
                    return (
                      <label key={g.id} className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer text-sm" style={{ background: checked ? "var(--p-primary-soft)" : "var(--p-bg)", border: checked ? "1px solid var(--p-primary)" : "1px solid transparent" }}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(g.id)} className="w-4 h-4 accent-[#C8102E]" />
                        {g.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg" style={{ background: "#fff" }}>🎲</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: "var(--p-ink)" }}>{g.name}</p>
                          <p className="text-xs" style={{ color: "var(--p-ink3)" }}>Entré le {formatDate(g.addedAt)}{meta ? " · " + meta : ""}</p>
                        </div>
                        {isRecent(g) && <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#e3f0d8", color: "#3b5a1f" }}>Nouveau</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-5 space-y-3" style={{ borderTop: "1px solid var(--p-rule)" }}>
          {error && <p className="text-sm" style={{ color: "var(--p-primary)" }}>{error}</p>}
          {msg && <p className="text-sm font-semibold" style={{ color: "var(--p-vert)" }}>{msg}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: "var(--p-ink)" }}>{selectedCount} jeu{selectedCount > 1 ? "x" : ""} sélectionné{selectedCount > 1 ? "s" : ""}</span>
            {location && (
              <label className="flex items-center gap-2 text-xs" style={{ color: "var(--p-ink2)" }}>
                <input type="checkbox" checked={onlyLocation} onChange={(e) => { setOnlyLocation(e.target.checked); setPreview(null); }} className="w-4 h-4 accent-[#C8102E]" />
                Uniquement les membres de {location}
              </label>
            )}
            <div className="flex flex-wrap gap-2 ml-auto">
              <button onClick={() => call("preview")} disabled={!!busy || selectedCount === 0} className="px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50" style={{ border: "1px solid var(--p-rule)", background: "#fff", color: "var(--p-ink2)" }}>
                {busy === "preview" ? "…" : "👁 Aperçu"}
              </button>
              <button onClick={() => call("test")} disabled={!!busy || selectedCount === 0} className="px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50" style={{ border: "1px solid var(--p-rule)", background: "#fff", color: "var(--p-ink2)" }}>
                {busy === "test" ? "Envoi…" : "✉️ M'envoyer un test"}
              </button>
              <button onClick={() => setConfirming(true)} disabled={!!busy || selectedCount === 0} className="px-4 py-1.5 rounded-full text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--p-bleu)" }}>
                {busy === "send" ? "Envoi en cours…" : "📧 Envoyer à tous"}
              </button>
            </div>
          </div>
          {confirming && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "var(--p-bg)", border: "1px solid var(--p-rule)" }}>
              <span className="flex-1 font-medium" style={{ color: "var(--p-ink)" }}>
                Envoyer l&apos;annonce de {selectedCount} jeu{selectedCount > 1 ? "x" : ""} à {recipientsLabel} ?
              </span>
              <button onClick={() => setConfirming(false)} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: "1px solid var(--p-rule)", color: "var(--p-ink2)" }}>Non</button>
              <button onClick={() => call("send")} className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "var(--p-primary)" }}>Oui, envoyer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminGamesPage() {
  const { data: session } = useSession();
  const [games, setGames]       = useState<GameDTO[]>([]);
  const [loading, setLoading]   = useState(true);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "AVAILABLE" | "BORROWED" | "SUSPENDED">("");
  const [filterCategory, setFilterCategory] = useState<GameCategory | "">("");
  const [sort, setSort]         = useState("name_asc");
  const [enriching, setEnriching] = useState<Record<string, boolean>>({});
  const [editingGame, setEditingGame] = useState<GameDTO | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNewGamesEmail, setShowNewGamesEmail] = useState(false);
  const [bulkTranslating, setBulkTranslating] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);

  const currentLocation = session?.user.location;

  async function loadGames() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);
    const res = await fetch(`/api/games?${params}`);
    let data: GameDTO[] = await res.json();
    if (sort === "name_desc") data = [...data].sort((a, b) => b.name.localeCompare(a.name, "fr"));
    else if (sort === "recent") data = [...data].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    else data = [...data].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    setGames(data);
    setLoading(false);
  }

  useEffect(() => { loadGames(); }, [search, filterStatus, filterCategory, sort, currentLocation]);

  async function toggleSuspend(game: GameDTO) {
    const newStatus = game.status === "SUSPENDED" ? "AVAILABLE" : "SUSPENDED";
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setMessages((m) => ({ ...m, [game.id]: res.ok ? `Statut : ${STATUS_LABELS[newStatus]}` : "Erreur" }));
    if (res.ok) loadGames();
  }

  async function deleteGame(game: GameDTO) {
    if (!confirm(`Supprimer "${game.name}" définitivement ?`)) return;
    const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) setMessages((m) => ({ ...m, [game.id]: d.error ?? "Erreur" }));
    else loadGames();
  }

  async function forceDeleteGame(game: GameDTO) {
    if (!confirm(`⚠ Supprimer "${game.name}" ET tout son historique d'emprunts ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/games/${game.id}?force=1`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) setMessages((m) => ({ ...m, [game.id]: d.error ?? "Erreur" }));
    else loadGames();
  }

  async function changeCategory(game: GameDTO, category: string) {
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    if (res.ok) loadGames();
    else setMessages((m) => ({ ...m, [game.id]: "Erreur catégorie" }));
  }

  async function enrich(game: GameDTO) {
    setEnriching((e) => ({ ...e, [game.id]: true }));
    const res = await fetch(`/api/admin/games/${game.id}/enrich`, { method: "POST" });
    const d = await res.json();
    setEnriching((e) => ({ ...e, [game.id]: false }));
    setMessages((m) => ({ ...m, [game.id]: res.ok ? "✓ Enrichi via BGG" : (d.error ?? "Erreur BGG") }));
    if (res.ok) loadGames();
  }

  async function translateAllSummaries() {
    setBulkMsg("");
    setBulkTranslating(true);
    try {
      const check = await fetch("/api/admin/games/translate-summaries");
      const info = await check.json().catch(() => ({}));
      if (!check.ok) { setBulkMsg(info.error ?? "Erreur."); return; }
      if (!info.count) { setBulkMsg("✓ Tous les résumés sont déjà en français."); return; }
      if (!confirm(`${info.count} résumé(s) semblent en anglais. Les traduire en français maintenant ?`)) return;
      let done = 0, failed = 0, remaining = info.count;
      while (remaining > 0) {
        const res = await fetch("/api/admin/games/translate-summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 10 }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { setBulkMsg(d.error ?? "Erreur pendant la traduction."); break; }
        done += d.translated?.length ?? 0;
        failed += d.failed?.length ?? 0;
        remaining = d.remaining ?? 0;
        setBulkMsg(`Traduction… ${done} fait(s)${remaining ? `, ${remaining} restant(s)` : ""}`);
        if ((d.translated?.length ?? 0) === 0 && (d.failed?.length ?? 0) === 0) break;
      }
      setBulkMsg(`✓ ${done} résumé(s) traduit(s)${failed ? `, ${failed} échec(s)` : ""}`);
      loadGames();
    } catch {
      setBulkMsg("Erreur réseau.");
    } finally {
      setBulkTranslating(false);
    }
  }

  const duplicateNames = new Set(
    Object.entries(
      games.reduce<Record<string, number>>((acc, g) => {
        const key = g.name.trim().toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})
    )
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
  );

  const displayedGames = duplicatesOnly
    ? games.filter((g) => duplicateNames.has(g.name.trim().toLowerCase()))
    : games;

  const catConfig = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des jeux</h1>
        <div className="flex gap-2 items-center">
          {bulkMsg && <span className="text-xs text-gray-600 mr-1">{bulkMsg}</span>}
          <button
            onClick={translateAllSummaries}
            disabled={bulkTranslating}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Détecter les résumés en anglais et les traduire en français"
          >
            {bulkTranslating ? "Traduction…" : "🇫🇷 Traduire les résumés"}
          </button>
          <button
            onClick={() => setShowNewGamesEmail(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            title="Envoyer un email présentant les nouveaux jeux"
          >
            📧 Nouveaux jeux
          </button>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="px-4 py-2 border border-[#C8102E] text-[#C8102E] rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            + Ajouter un jeu
          </button>
          <a href="/admin/import" className="px-4 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            + Import Excel
          </a>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <input
          type="search"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <div className="flex flex-wrap gap-2 items-center">
          {/* Statut */}
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === f.value
                  ? "bg-[#C8102E] text-white border-[#C8102E]"
                  : "border-gray-300 text-gray-600 hover:border-gray-400 bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {/* Catégorie */}
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(filterCategory === c.value ? "" : c.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-colors ${
                filterCategory === c.value
                  ? `${c.color} border-transparent`
                  : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {/* Doublons */}
          <button
            onClick={() => setDuplicatesOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              duplicatesOnly
                ? "bg-orange-500 text-white border-orange-500"
                : "border-gray-300 text-gray-600 hover:border-gray-400 bg-white"
            }`}
          >
            🔁 Doublons{duplicateNames.size > 0 && !duplicatesOnly && ` (${duplicateNames.size})`}
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          {/* Tri */}
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                sort === s.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-600 hover:border-gray-400 bg-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Jeu</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Catégorie</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Entrée</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedGames.map((g) => {
                const isDuplicate = duplicateNames.has(g.name.trim().toLowerCase());
                return (
                <tr key={g.id} className={isDuplicate ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-gray-50"}>
                  {/* Nom — cliquable pour éditer */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                        {g.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.coverUrl} alt={g.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="flex items-center justify-center h-full text-sm">🎲</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingGame(g)}
                            className="font-medium text-gray-900 hover:text-[#C8102E] hover:underline text-left"
                          >
                            {g.name}
                          </button>
                          {isDuplicate && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 bg-orange-100 text-orange-600" title="Nom en doublon">
                              🔁
                            </span>
                          )}
                          {(g.reportCount ?? 0) > 0 && (
                            <a
                              href={`/games/${g.id}`}
                              className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: "#fde2d2", color: "#d24a1f" }}
                              title={`${g.reportCount} signalement${(g.reportCount ?? 0) > 1 ? "s" : ""}`}
                            >🚨</a>
                          )}
                        </div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {!g.coverUrl && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Non enrichi</span>
                          )}
                          {!g.barcode && (
                            <span title="Code-barres manquant" className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">📵 Sans code-barres</span>
                          )}
                        </div>
                        {messages[g.id] && <p className="text-xs mt-0.5 text-gray-500">{messages[g.id]}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Catégorie — select inline */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      value={g.category}
                      onChange={(e) => changeCategory(g, e.target.value)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-300 ${catConfig[g.category]?.color ?? "bg-gray-200 text-gray-700"}`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-white text-gray-800 font-normal">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Date entrée */}
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                    {formatDate(g.addedAt)}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      g.status === "AVAILABLE" ? "bg-green-100 text-green-700"
                      : g.status === "BORROWED" ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-500"
                    }`}>
                      {STATUS_LABELS[g.status]}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1.5 justify-end flex-wrap">
                      <button
                        onClick={() => setEditingGame(g)}
                        className="text-xs px-2.5 py-1 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        ✏ Modifier
                      </button>
                      <button
                        onClick={() => enrich(g)}
                        disabled={enriching[g.id]}
                        className="text-xs px-2.5 py-1 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition-colors"
                        title="Enrichir les données depuis BoardGameGeek"
                      >
                        {enriching[g.id] ? "..." : "BGG ↻"}
                      </button>
                      <button
                        onClick={() => toggleSuspend(g)}
                        disabled={g.status === "BORROWED"}
                        className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-40 transition-colors"
                      >
                        {g.status === "SUSPENDED" ? "Réactiver" : "Suspendre"}
                      </button>
                      <button
                        onClick={() => deleteGame(g)}
                        disabled={g.status === "BORROWED"}
                        className="text-xs px-2.5 py-1 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                      >
                        Supprimer
                      </button>
                      <button
                        onClick={() => forceDeleteGame(g)}
                        className="text-xs px-2.5 py-1 border border-red-400 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                        title="Supprimer le jeu ET tout l'historique d'emprunts (temporaire)"
                      >
                        🗑 + historique
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingGame && (
        <EditModal
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSaved={() => { setEditingGame(null); loadGames(); }}
        />
      )}

      {showNewGamesEmail && (
        <NewGamesEmailModal location={currentLocation} onClose={() => setShowNewGamesEmail(false)} />
      )}

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdded={() => loadGames()}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-4 gap-3">
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Résumé</label>
            <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
          </div>

          {/* Image + Code-barre + BGG ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">URL image</label>
            <input value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 font-mono text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Code-barre</label>
              <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200" />
            </div>
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; bggFound: boolean } | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !category) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/games/quick-add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), category }),
    });
    const data = await res.json();
    setLoading(false);
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
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button
                onClick={submit}
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

  const catConfig = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des jeux</h1>
        <div className="flex gap-2">
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
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
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
              {games.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
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
                        <button
                          onClick={() => setEditingGame(g)}
                          className="font-medium text-gray-900 hover:text-[#C8102E] hover:underline text-left"
                        >
                          {g.name}
                        </button>
                        {!g.coverUrl && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Non enrichi</span>
                        )}
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
                    </div>
                  </td>
                </tr>
              ))}
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

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onAdded={() => loadGames()}
        />
      )}
    </div>
  );
}

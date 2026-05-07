"use client";

import { useRef, useState } from "react";

interface ImportState {
  created: number;
  skipped: number;
  errors: { name: string; reason: string }[];
  progress: number;
  done: boolean;
}

const EMPTY: ImportState = { created: 0, skipped: 0, errors: [], progress: 0, done: false };

export default function AdminImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ImportState | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setState({ ...EMPTY });

    const controller = new AbortController();
    abortRef.current = controller;

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: form, signal: controller.signal });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erreur lors de l'import.");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (part.startsWith("data: ")) {
            try {
              const data = JSON.parse(part.slice(6));
              setState({ ...EMPTY, ...data });
              if (data.done) { setLoading(false); }
            } catch { /* ignore malformed chunk */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Erreur réseau.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Import de jeux via Excel</h1>
      <p className="text-sm text-gray-500 mb-3">
        Le fichier doit avoir une <strong>ligne de titre</strong> puis les données :
      </p>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-3 text-sm font-mono">
        <div className="grid grid-cols-5 gap-2 text-center mb-1 text-xs font-sans font-semibold text-gray-500">
          <div>Colonne A</div><div>Colonne B</div><div>Colonne C</div><div>Colonne D</div><div>Colonne E</div>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="bg-white border rounded px-2 py-2 text-gray-700 text-xs">Nom du jeu</div>
          <div className="bg-white border rounded px-2 py-2 text-gray-700 text-xs">Catégorie</div>
          <div className="bg-white border rounded px-2 py-2 text-gray-400 italic text-xs">Date d&apos;entrée</div>
          <div className="bg-white border rounded px-2 py-2 text-gray-400 italic text-xs">ID BGG</div>
          <div className="bg-white border rounded px-2 py-2 text-gray-400 italic text-xs">Code barre</div>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center mt-2 text-xs text-gray-500">
          <div>Catan</div><div>famille</div><div>15/01/2024</div><div>13</div><div>3558380013</div>
        </div>
        <div className="grid grid-cols-5 gap-2 text-center mt-1 text-xs text-gray-400 italic">
          <div>Azul</div><div>expert</div><div>vide = aujourd&apos;hui</div><div>optionnel</div><div>optionnel</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Catégories valides : <span className="font-medium">escape, famille, ambiance, enfant, initié, expert</span>.
        Si l&apos;ID BGG (colonne D) est renseigné, il est utilisé directement sans recherche — plus rapide et plus fiable.
        Le code barre (colonne E) est utilisé s&apos;il est fourni, sinon récupéré automatiquement.
        Les autres infos (résumé, image, joueurs, durée, âge) sont récupérées sur BoardGameGeek en français.
      </p>

      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-red-300 transition-colors"
        onClick={() => !loading && inputRef.current?.click()}
      >
        <div className="text-4xl mb-3">📊</div>
        {file ? (
          <p className="font-medium text-gray-800">{file.name}</p>
        ) : (
          <p className="text-gray-500 text-sm">Cliquez pour sélectionner un fichier .xlsx</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setState(null); setError(""); }}
        />
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      {/* Barre de progression */}
      {loading && state && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Import en cours… ({state.progress}%)</span>
            <button
              onClick={handleStop}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            >
              ⏹ Arrêter
            </button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-[#C8102E] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {state.created} créé(s) · {state.skipped} ignoré(s) · {state.errors.length} erreur(s)
          </p>
        </div>
      )}

      {!loading && (
        <button
          onClick={handleImport}
          disabled={!file}
          className="mt-4 w-full py-3 bg-[#C8102E] text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          Lancer l&apos;import
        </button>
      )}

      {state?.done && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Résultats de l&apos;import</h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-700">{state.created}</div>
              <div className="text-xs text-green-600">Créés</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-500">{state.skipped}</div>
              <div className="text-xs text-gray-400">Ignorés (déjà existants)</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{state.errors.length}</div>
              <div className="text-xs text-red-400">Erreurs</div>
            </div>
          </div>
          {state.errors.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-2">Détail des erreurs :</p>
              {state.errors.map((e, i) => (
                <div key={i} className="text-red-600 text-xs mb-1">• {e.name} : {e.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import type { ImportResult } from "@ludigest/types";

export default function AdminImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/admin/import", { method: "POST", body: form });
    setLoading(false);

    if (res.ok) {
      setResult(await res.json());
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur lors de l'import.");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Import de jeux via Excel</h1>
      <p className="text-sm text-gray-500 mb-3">
        Le fichier doit avoir une <strong>ligne de titre</strong> puis les données :
      </p>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-3 text-sm font-mono">
        <div className="grid grid-cols-3 gap-2 text-center mb-1 text-xs font-sans font-semibold text-gray-500">
          <div>Colonne A</div><div>Colonne B</div><div>Colonne C</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white border rounded px-3 py-2 text-gray-700">Nom du jeu</div>
          <div className="bg-white border rounded px-3 py-2 text-gray-700">Catégorie</div>
          <div className="bg-white border rounded px-3 py-2 text-gray-400 italic">Date d&apos;entrée</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-2 text-xs text-gray-500">
          <div>Catan</div><div>famille</div><div>15/01/2024</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center mt-1 text-xs text-gray-500">
          <div>Azul</div><div>expert</div><div className="italic text-gray-400">vide = aujourd&apos;hui</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Catégories valides : <span className="font-medium">escape, famille, ambiance, enfant, initié, expert</span>.
        La date d&apos;entrée accepte les formats <span className="font-medium">JJ/MM/AAAA</span> ou <span className="font-medium">AAAA-MM-JJ</span> — si absente, la date du jour est utilisée.
        Les autres infos (résumé, image, joueurs, durée, âge) sont récupérées automatiquement sur BoardGameGeek.
      </p>

      <div
        className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-red-300 transition-colors"
        onClick={() => inputRef.current?.click()}
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
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}

      <button
        onClick={handleImport}
        disabled={!file || loading}
        className="mt-4 w-full py-3 bg-[#C8102E] text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Import en cours (patience, enrichissement BGG)..." : "Lancer l'import"}
      </button>

      {result && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Résultats de l'import</h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-700">{result.created}</div>
              <div className="text-xs text-green-600">Créés</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-500">{result.skipped}</div>
              <div className="text-xs text-gray-400">Ignorés (déjà existants)</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
              <div className="text-xs text-red-400">Erreurs</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-2">Détail des erreurs :</p>
              {result.errors.map((e, i) => (
                <div key={i} className="text-red-600 text-xs mb-1">• {e.name} : {e.reason}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

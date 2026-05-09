"use client";

import { useRef, useState } from "react";

interface Duplicate {
  name: string;
  existingName: string;
  existingId: string;
}

interface ScanResult {
  total: number;
  duplicates: Duplicate[];
}

interface ImportState {
  created: number;
  skipped: number;
  errors: { name: string; reason: string }[];
  progress: number;
  current: number;
  total: number;
  done: boolean;
}

const EMPTY_IMPORT: ImportState = { created: 0, skipped: 0, errors: [], progress: 0, current: 0, total: 0, done: false };

type Phase = "idle" | "scanning" | "ready" | "importing" | "done";

export default function AdminImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");
  // Map: game name → true = force create, false = skip
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [importState, setImportState] = useState<ImportState | null>(null);

  async function handleFileChange(f: File | null) {
    setFile(f);
    setScan(null);
    setScanError("");
    setDecisions({});
    setImportState(null);
    if (!f) { setPhase("idle"); return; }

    setPhase("scanning");
    const form = new FormData();
    form.append("file", f);
    try {
      const res = await fetch("/api/admin/import/check", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setScanError(data.error ?? "Erreur lors de l'analyse."); setPhase("idle"); return; }
      setScan(data as ScanResult);
      // Par défaut : ignorer les doublons
      const init: Record<string, boolean> = {};
      for (const d of (data as ScanResult).duplicates) init[d.name] = false;
      setDecisions(init);
      setPhase("ready");
    } catch {
      setScanError("Erreur réseau lors de l'analyse.");
      setPhase("idle");
    }
  }

  async function handleImport() {
    if (!file || !scan) return;
    setPhase("importing");
    setImportState({ ...EMPTY_IMPORT, total: scan.total });

    const controller = new AbortController();
    abortRef.current = controller;

    const forceNames = Object.entries(decisions)
      .filter(([, force]) => force)
      .map(([name]) => name);

    const form = new FormData();
    form.append("file", file);
    if (forceNames.length > 0) form.append("forceNames", JSON.stringify(forceNames));

    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: form, signal: controller.signal });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setScanError(d.error ?? "Erreur lors de l'import.");
        setPhase("ready");
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
              setImportState((prev) => ({ ...EMPTY_IMPORT, ...prev, ...data }));
              if (data.done) setPhase("done");
            } catch { /* ignore malformed chunk */ }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setScanError("Erreur réseau.");
        setPhase("ready");
      }
    } finally {
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setPhase("done");
  }

  function reset() {
    setFile(null);
    setScan(null);
    setScanError("");
    setDecisions({});
    setImportState(null);
    setPhase("idle");
  }

  const newCount = scan ? scan.total - scan.duplicates.length : 0;
  const forceCount = Object.values(decisions).filter(Boolean).length;

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

      {/* Zone de dépôt */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
          phase === "importing" ? "opacity-50 cursor-not-allowed border-gray-200" : "cursor-pointer hover:border-red-300 border-gray-300"
        }`}
        onClick={() => phase !== "importing" && inputRef.current?.click()}
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
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Scan en cours */}
      {phase === "scanning" && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <svg className="animate-spin h-4 w-4 text-[#C8102E]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Analyse du fichier en cours…
        </div>
      )}

      {scanError && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{scanError}</div>
      )}

      {/* Résultat du scan */}
      {phase === "ready" && scan && (
        <div className="mt-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <span className="font-semibold">{scan.total} jeu{scan.total > 1 ? "x" : ""} détecté{scan.total > 1 ? "s" : ""}</span>
            {scan.duplicates.length === 0 ? (
              <span className="text-blue-600"> — aucun doublon trouvé.</span>
            ) : (
              <span className="text-orange-600"> — <span className="font-semibold">{scan.duplicates.length} doublon{scan.duplicates.length > 1 ? "s" : ""}</span> détecté{scan.duplicates.length > 1 ? "s" : ""}.</span>
            )}
          </div>

          {scan.duplicates.length > 0 && (
            <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-orange-50 border-b border-orange-200">
                <p className="text-sm font-semibold text-orange-800">Doublons détectés</p>
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setDecisions(Object.fromEntries(scan.duplicates.map((d) => [d.name, false])))}
                    className="px-2 py-1 rounded border border-orange-300 text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    Ignorer tous
                  </button>
                  <button
                    onClick={() => setDecisions(Object.fromEntries(scan.duplicates.map((d) => [d.name, true])))}
                    className="px-2 py-1 rounded border border-orange-300 text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    Créer tous en doublon
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {scan.duplicates.map((d) => (
                  <div key={d.name} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                      <p className="text-xs text-gray-400">Existe déjà : {d.existingName}</p>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => setDecisions((p) => ({ ...p, [d.name]: false }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          !decisions[d.name]
                            ? "bg-gray-700 text-white border-gray-700"
                            : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        Ignorer
                      </button>
                      <button
                        onClick={() => setDecisions((p) => ({ ...p, [d.name]: true }))}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          decisions[d.name]
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-orange-500 border-orange-300 hover:border-orange-400"
                        }`}
                      >
                        Créer en doublon
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            {newCount + forceCount} jeu{newCount + forceCount > 1 ? "x" : ""} seront importés
            {scan.duplicates.length - forceCount > 0 && ` · ${scan.duplicates.length - forceCount} ignoré${scan.duplicates.length - forceCount > 1 ? "s" : ""}`}
          </div>

          <button
            onClick={handleImport}
            className="w-full py-3 bg-[#C8102E] text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Lancer l&apos;import
          </button>
        </div>
      )}

      {/* Import en cours */}
      {phase === "importing" && importState && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Import en cours… <span className="font-semibold text-gray-800">{importState.current} / {importState.total}</span>
            </span>
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
              style={{ width: `${importState.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {importState.created} créé(s) · {importState.skipped} ignoré(s) · {importState.errors.length} erreur(s)
          </p>
        </div>
      )}

      {/* Résultats finaux */}
      {phase === "done" && importState && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Résultats de l&apos;import</h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-700">{importState.created}</div>
              <div className="text-xs text-green-600">Créés</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-500">{importState.skipped}</div>
              <div className="text-xs text-gray-400">Ignorés</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-red-600">{importState.errors.length}</div>
              <div className="text-xs text-red-400">Erreurs</div>
            </div>
          </div>
          {importState.errors.length > 0 && (
            <div className="text-sm mb-4">
              <p className="font-medium text-gray-700 mb-2">Détail des erreurs :</p>
              {importState.errors.map((e, i) => (
                <div key={i} className="text-red-600 text-xs mb-1">• {e.name} : {e.reason}</div>
              ))}
            </div>
          )}
          <button
            onClick={reset}
            className="w-full py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Nouvel import
          </button>
        </div>
      )}
    </div>
  );
}

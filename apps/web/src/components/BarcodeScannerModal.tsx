"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface Props {
  onClose: () => void;
}

type Status = "scanning" | "found" | "borrowing" | "borrowed" | "borrow_error" | "notfound" | "error" | "denied";

export function BarcodeScannerModal({ onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const router = useRouter();

  const [status, setStatus] = useState<Status>("scanning");
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState("");
  const [barcodeRef, setBarcodeRef] = useState("");
  const [borrowError, setBorrowError] = useState("");

  const startScan = useCallback(() => {
    readerRef.current?.reset();
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        async (result, err) => {
          if (result) {
            const barcode = result.getText();
            reader.reset();
            try {
              const res = await fetch(`/api/games?barcode=${encodeURIComponent(barcode)}`);
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                setGameId(data[0].id);
                setGameName(data[0].name);
                setBarcodeRef(barcode);
                setStatus("found");
              } else {
                setStatus("notfound");
              }
            } catch {
              setStatus("error");
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            // NotFoundException fires every frame with no barcode — safe to ignore
          }
        }
      )
      .catch((e: Error) => {
        if (e.name === "NotAllowedError") setStatus("denied");
        else setStatus("error");
      });
  }, []);

  useEffect(() => {
    startScan();
    return () => { readerRef.current?.reset(); };
  }, [startScan]);

  function handleRetry() {
    setBorrowError("");
    setStatus("scanning");
    startScan();
  }

  async function handleBorrow() {
    setStatus("borrowing");
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcodeRef }),
      });
      if (res.ok) {
        setStatus("borrowed");
      } else {
        const d = await res.json();
        setBorrowError(d.error ?? "Erreur lors de l'emprunt.");
        setStatus("borrow_error");
      }
    } catch {
      setBorrowError("Erreur réseau.");
      setStatus("borrow_error");
    }
  }

  function handleGoToGame() {
    router.push(`/games/${gameId}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Scanner un jeu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ display: status === "scanning" ? "block" : "none" }}
          />

          {/* Aim guide */}
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-28 border-2 border-white rounded-xl opacity-70" />
            </div>
          )}

          {/* Result overlay */}
          {status !== "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              {(status === "found" || status === "borrowing") && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">🎲</div>
                  <p className="font-semibold text-lg">{gameName}</p>
                  <p className="text-sm text-white/60 mt-1">Jeu trouvé !</p>
                </div>
              )}
              {status === "borrowed" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-semibold text-lg">{gameName}</p>
                  <p className="text-sm text-white/60 mt-1">Emprunt enregistré — 4 semaines</p>
                </div>
              )}
              {status === "borrow_error" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p className="font-semibold">{borrowError}</p>
                </div>
              )}
              {status === "notfound" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="font-semibold">Code-barres non reconnu</p>
                  <p className="text-sm text-white/60 mt-1">Ce jeu n&apos;est pas dans le catalogue.</p>
                </div>
              )}
              {status === "denied" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">🚫</div>
                  <p className="font-semibold">Accès caméra refusé</p>
                  <p className="text-sm text-white/60 mt-2">
                    Autorisez la caméra dans les paramètres de votre navigateur, puis réessayez.
                  </p>
                </div>
              )}
              {status === "error" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p className="font-semibold">Erreur de connexion</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4">
          {status === "scanning" && (
            <p className="text-sm text-center text-gray-500">
              Pointez la caméra arrière vers le code-barres de la boîte
            </p>
          )}
          {status === "found" && (
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
              >
                Rescanner
              </button>
              <button
                onClick={handleBorrow}
                className="flex-1 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Emprunter ce jeu
              </button>
            </div>
          )}
          {status === "borrowing" && (
            <p className="text-sm text-center text-gray-500">Enregistrement de l&apos;emprunt…</p>
          )}
          {status === "borrowed" && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleGoToGame}
                className="flex-1 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Voir le jeu →
              </button>
            </div>
          )}
          {status === "borrow_error" && (
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
              >
                Rescanner
              </button>
              <button
                onClick={handleGoToGame}
                className="flex-1 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Voir le jeu
              </button>
            </div>
          )}
          {(status === "notfound" || status === "error") && (
            <button
              onClick={handleRetry}
              className="w-full py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          )}
          {status === "denied" && (
            <button
              onClick={onClose}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface Props {
  onClose: () => void;
}

export function BarcodeScannerModal({ onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const router = useRouter();

  const [status, setStatus] = useState<"scanning" | "found" | "notfound" | "error">("scanning");
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(null, videoRef.current!, async (result, err) => {
      if (result) {
        const barcode = result.getText();
        reader.reset();

        try {
          const res = await fetch(`/api/games?barcode=${encodeURIComponent(barcode)}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setGameId(data[0].id);
            setGameName(data[0].name);
            setStatus("found");
          } else {
            setStatus("notfound");
          }
        } catch {
          setStatus("error");
        }
      }
      if (err && !(err instanceof NotFoundException)) {
        // ignore NotFoundException — it fires continuously when no barcode in frame
      }
    });

    return () => {
      reader.reset();
    };
  }, []);

  function handleGo() {
    router.push(`/games/${gameId}`);
    onClose();
  }

  function handleRetry() {
    setStatus("scanning");
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    reader.decodeFromVideoDevice(null, videoRef.current!, async (result, err) => {
      if (result) {
        const barcode = result.getText();
        reader.reset();
        try {
          const res = await fetch(`/api/games?barcode=${encodeURIComponent(barcode)}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setGameId(data[0].id);
            setGameName(data[0].name);
            setStatus("found");
          } else {
            setStatus("notfound");
          }
        } catch {
          setStatus("error");
        }
      }
      if (err && !(err instanceof NotFoundException)) {
        // ignore
      }
    });
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

        {/* Camera */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: status === "scanning" ? "block" : "none" }}
          />

          {/* Scan overlay */}
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-32 border-2 border-white rounded-xl opacity-70" />
            </div>
          )}

          {/* Result overlay */}
          {status !== "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              {status === "found" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">🎲</div>
                  <p className="font-semibold text-lg">{gameName}</p>
                  <p className="text-sm text-white/70 mt-1">Jeu trouvé !</p>
                </div>
              )}
              {status === "notfound" && (
                <div className="text-center text-white px-6">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="font-semibold">Code-barres non reconnu</p>
                  <p className="text-sm text-white/70 mt-1">Ce jeu n&apos;est pas dans le catalogue.</p>
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
              Pointez la caméra vers le code-barres de la boîte de jeu
            </p>
          )}
          {status === "found" && (
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-400"
              >
                Rescanner
              </button>
              <button
                onClick={handleGo}
                className="flex-1 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700"
              >
                Voir le jeu →
              </button>
            </div>
          )}
          {(status === "notfound" || status === "error") && (
            <button
              onClick={handleRetry}
              className="w-full py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-medium hover:bg-red-700"
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

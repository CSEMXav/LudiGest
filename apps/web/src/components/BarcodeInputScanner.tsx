"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

function ScanModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [status, setStatus] = useState<"scanning" | "denied" | "error">("scanning");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, err) => {
          if (result) {
            reader.reset();
            onScan(result.getText());
            onClose();
          }
          if (err && !(err instanceof NotFoundException)) {
            // ignore continuous NotFoundException
          }
        }
      )
      .catch((e: Error) => {
        setStatus(e.name === "NotAllowedError" ? "denied" : "error");
      });

    return () => { reader.reset(); };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xs sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Scanner le code-barres</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <video
            ref={videoRef}
            autoPlay muted playsInline
            className="w-full h-full object-cover"
            style={{ display: status === "scanning" ? "block" : "none" }}
          />
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-20 border-2 border-white rounded-xl opacity-70" />
            </div>
          )}
          {status !== "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center px-6">
              <div>
                <div className="text-3xl mb-2">{status === "denied" ? "🚫" : "⚠️"}</div>
                <p className="text-sm font-medium">
                  {status === "denied" ? "Accès caméra refusé" : "Erreur caméra"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 text-center text-xs text-gray-500">
          Pointez vers le code-barres de la boîte
        </div>
      </div>
    </div>
  );
}

export function BarcodeInputScanner({ onScan, onClose }: Props) {
  return <ScanModal onScan={onScan} onClose={onClose} />;
}

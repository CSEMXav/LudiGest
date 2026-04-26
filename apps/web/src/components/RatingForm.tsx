"use client";

import { useState } from "react";

interface Props {
  gameId: string;
  existing?: { stars: number; comment?: string | null };
  onSaved: () => void;
}

export function RatingForm({ gameId, existing, onSaved }: Props) {
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!stars) return setError("Choisissez une note.");
    setLoading(true);
    setError("");
    const res = await fetch(`/api/games/${gameId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, comment }),
    });
    setLoading(false);
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json();
      setError(d.error ?? "Erreur");
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
      <h3 className="font-semibold text-gray-800 mb-3">
        {existing ? "Modifier ma note" : "Laisser un avis"}
      </h3>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStars(s)}
            className={`text-2xl transition-transform hover:scale-110 ${s <= stars ? "text-yellow-400" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Commentaire (optionnel)..."
        className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
        rows={3}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      <button
        onClick={submit}
        disabled={loading || !stars}
        className="mt-2 px-4 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Envoi..." : "Publier l'avis"}
      </button>
    </div>
  );
}

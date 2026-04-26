"use client";

import { useState } from "react";
import Link from "next/link";
import { LOCATIONS } from "@ludigest/types";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", matricule: "", password: "", location: "",
  });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) { setSuccess(true); }
    else { const d = await res.json(); setError(d.error ?? "Erreur lors de l'inscription."); }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Vérifiez votre email</h1>
          <p className="text-gray-500 text-sm">
            Un lien de confirmation a été envoyé à <strong>{form.email}</strong>.<br />
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-[#C8102E] font-medium hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎲</div>
          <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-1">Réservé aux collaborateurs BRED</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
                placeholder="Jean" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
                placeholder="Dupont" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (@bred.fr)</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
              placeholder="jean.dupont@bred.fr" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
            <input type="text" value={form.matricule} onChange={(e) => set("matricule", e.target.value)}
              placeholder="12345" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe (min. 8 caractères)</label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              minLength={8} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ludothèque</label>
            <div className="grid grid-cols-2 gap-3">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => set("location", loc)}
                  className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                    form.location === loc
                      ? "border-[#C8102E] bg-red-50 text-[#C8102E]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  📍 {loc}
                </button>
              ))}
            </div>
            {!form.location && <p className="text-xs text-gray-400 mt-1">Choisissez votre ludothèque</p>}
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <button type="submit" disabled={loading || !form.location}
            className="w-full bg-[#C8102E] text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-[#C8102E] font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

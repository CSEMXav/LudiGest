"use client";

import { useState } from "react";
import Link from "next/link";
import { LOCATIONS } from "@ludigest/types";

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", matricule: "", password: "", location: "",
    nickname: "", visibleInMembers: true,
  });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string | boolean) { setForm((f) => ({ ...f, [field]: value })); }

  function validate(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "L'adresse email n'est pas valide.";
    if (!/^\d{5}$/.test(form.matricule)) return "Le matricule doit contenir exactement 5 chiffres.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    const payload = {
      ...form,
      nickname: form.nickname.trim() || form.email,
    };
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

        <p className="text-xs text-gray-400 mb-4"><span className="text-red-500">*</span> Champs obligatoires</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
              <input type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
                placeholder="Jean" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
              <input type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)}
                placeholder="Dupont" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={(e) => { set("email", e.target.value); if (!form.nickname) set("nickname", e.target.value); }}
              placeholder="jean.dupont@exemple.fr" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Surnom <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(affiché dans la liste des membres)</span></label>
            <input type="text" value={form.nickname} onChange={(e) => set("nickname", e.target.value)}
              placeholder={form.email || "Votre surnom…"}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>

          {/* Visibility toggle — directly below nickname */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={form.visibleInMembers}
                onChange={(e) => set("visibleInMembers", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-checked:bg-[#C8102E] rounded-full transition-colors" />
              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Visible dans la liste des membres</p>
              <p className="text-xs text-gray-400">Votre surnom et nombre d&apos;emprunts seront visibles par les autres membres.</p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matricule <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(uniquement les 5 chiffres)</span></label>
            <input type="text" value={form.matricule}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); set("matricule", v.slice(0, 5)); }}
              placeholder="12345" required inputMode="numeric" maxLength={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(min. 8 caractères)</span></label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              minLength={8} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ludothèque <span className="text-red-500">*</span></label>
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
            <p className="text-xs text-gray-400 mt-1">Vous pourrez changer de ludothèque directement depuis l&apos;application.</p>
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

"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const emailNotVerified = error.toLowerCase().includes("confirmer votre email");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResendDone(false);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      setError(res.error === "CredentialsSignin" ? "Email ou mot de passe incorrect." : res.error);
    } else {
      router.push("/games");
      // Keep loading=true so button stays disabled during navigation
    }
  }

  async function resendVerification() {
    setResendLoading(true);
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResendLoading(false);
    setResendDone(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎲</div>
          <h1 className="text-2xl font-bold text-gray-900">LudiGest</h1>
          <p className="text-gray-500 text-sm mt-1">Ludothèque BRED</p>
          <p className="text-gray-400 text-xs mt-1">v0.51</p>
        </div>

        {resetSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm mb-4">
            ✓ Mot de passe mis à jour. Vous pouvez vous connecter.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@exemple.fr"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
              {emailNotVerified && (
                <div className="mt-2">
                  {resendDone ? (
                    <p className="text-green-700 font-medium">✓ Email de confirmation renvoyé.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={resendVerification}
                      disabled={resendLoading}
                      className="underline font-medium hover:text-red-900 disabled:opacity-50"
                    >
                      {resendLoading ? "Envoi..." : "Renvoyer l'email de confirmation"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8102E] text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-[#C8102E] hover:underline transition-colors">
            J&apos;ai oublié mon mot de passe
          </Link>
        </p>

        <p className="text-center text-sm text-gray-500 mt-4">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-[#C8102E] font-medium hover:underline">
            Créer un compte
          </Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-3">
          <Link href="/comment-ca-marche" className="hover:text-[#C8102E] hover:underline transition-colors">
            Comment ça marche ?
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">Chargement...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}

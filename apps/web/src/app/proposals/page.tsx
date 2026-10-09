"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { ProposalsBoard } from "@/components/ProposalsBoard";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

export default function ProposalsPage() {
  const { data: session, status } = useSession();
  const [access, setAccess] = useState<"loading" | "open" | "closed">("loading");
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const location = session?.user?.location;

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = `/login?callbackUrl=${encodeURIComponent("/proposals")}`;
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/proposals/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setAccess(d?.isOpen ? "open" : "closed");
        setClosesAt(d?.isOpen ? d.closesAt : null);
      })
      .catch(() => setAccess("closed"));
  }, [status, location]);

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {access === "loading" ? (
          <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl" />)}</div>
        ) : access === "closed" ? (
          <div className="max-w-lg mx-auto py-16 text-center">
            <div className="text-5xl mb-6">🛒</div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--p-ink)" }}>Futurs achats</h1>
            <p className="text-base mb-6" style={{ color: "var(--p-ink2)" }}>
              Les propositions d&apos;achat ne sont pas ouvertes pour le moment.
            </p>
            <Link href="/games" className="inline-block px-5 py-2 bg-[#C8102E] text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              Retour au catalogue
            </Link>
          </div>
        ) : (
          <>
            {closesAt && (
              <p className="text-sm rounded-lg px-3 py-2 mb-4" style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}>
                ⏳ Propositions et votes ouverts jusqu&apos;au {formatDateTime(closesAt)}.
              </p>
            )}
            <ProposalsBoard key={location} />
          </>
        )}
      </main>
    </>
  );
}

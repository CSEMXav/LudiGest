"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { MemberDTO } from "@ludigest/types";
import { Navbar } from "@/components/Navbar";

type MemberWithVisibility = MemberDTO & { visibleInMembers?: boolean };

const TINTS = ["#d24a1f", "#e8a82f", "#6a8f3c", "#286b7a", "#c54a7a", "#3a5a8c"];

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<MemberWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isAdmin = session?.user?.role === "ADMIN";
  const currentUserId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => { setMembers(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const filtered = members.filter((m) =>
    m.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const visibleCount = members.filter((m) => m.visibleInMembers !== false).length;

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--p-ink)", fontFamily: "var(--font-display, system-ui)" }}>👥 Membres</h1>
        <p className="text-sm mb-6" style={{ color: "var(--p-ink3)" }}>
          {isAdmin
            ? `${members.length} membre(s) au total · ${visibleCount} visible(s) publiquement.`
            : "Membres inscrits sur LudiGest (ceux ayant choisi d'être visibles)."}
        </p>

        <input
          type="search"
          placeholder="Rechercher un membre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none"
          style={{ border: "1.5px solid var(--p-ink)", color: "var(--p-ink)", background: "var(--p-card)" }}
        />

        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--p-card)" }} />
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: "var(--p-ink3)" }}>
            {search ? "Aucun membre trouvé." : "Aucun membre visible pour l'instant."}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--p-card)", border: "1.5px solid var(--p-rule)" }}>
            {filtered.map((m, i) => {
              const isCurrent = m.id === currentUserId;
              const tint = TINTS[i % TINTS.length];
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between px-5 py-3.5 text-sm ${i > 0 ? "border-t" : ""}`}
                  style={{
                    borderTopColor: "var(--p-rule)",
                    background: isCurrent ? "var(--p-primary-soft)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white"
                      style={{ background: tint }}>
                      {m.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: "var(--p-ink)" }}>{m.nickname}</span>
                    {isAdmin && m.visibleInMembers === false && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--p-rule)", color: "var(--p-ink3)" }}>non visible</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-right" style={{ color: "var(--p-ink3)" }}>
                    {m.totalLoans === 0
                      ? "Pas encore d'emprunts"
                      : <>{m.activeLoans} en cours&nbsp;·&nbsp;{m.totalLoans} au total</>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

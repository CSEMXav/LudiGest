"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { MemberDTO } from "@ludigest/types";
import { Navbar } from "@/components/Navbar";

type MemberWithVisibility = MemberDTO & { visibleInMembers?: boolean };

export default function MembersPage() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<MemberWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const isAdmin = session?.user?.role === "ADMIN";

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">👥 Membres</h1>
        <p className="text-gray-500 text-sm mb-6">
          {isAdmin
            ? `${members.length} membre(s) au total · ${visibleCount} visible(s) publiquement.`
            : "Membres inscrits sur LudiGest (ceux ayant choisi d'être visibles)."}
        </p>

        <input
          type="search"
          placeholder="Rechercher un membre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
        />

        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {search ? "Aucun membre trouvé." : "Aucun membre visible pour l'instant."}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {filtered.map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center justify-between px-5 py-3.5 text-sm ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-[#C8102E] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {m.nickname.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{m.nickname}</span>
                  {isAdmin && m.visibleInMembers === false && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">non visible</span>
                  )}
                </div>
                <span className="text-gray-400 text-xs">
                  {m.totalLoans} emprunt{m.totalLoans > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LOCATIONS } from "@ludigest/types";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const [switching, setSwitching] = useState(false);

  async function switchLocation(loc: string) {
    setSwitching(true);
    await fetch("/api/user/location", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: loc }),
    });
    await update({ location: loc });
    setSwitching(false);
  }

  const currentLocation = session?.user.location ?? "Joinville";

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <nav className="flex gap-4 border-b border-gray-200 pb-4 flex-1">
            {[
              { href: "/admin", label: "Tableau de bord" },
              { href: "/admin/games", label: "Jeux" },
              { href: "/admin/loans", label: "Emprunts" },
              { href: "/admin/users", label: "Utilisateurs" },
              { href: "/admin/import", label: "Import Excel" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-[#C8102E] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 pb-4 ml-6 flex-shrink-0">
            <span className="text-xs text-gray-500">Ludothèque :</span>
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocation(loc)}
                disabled={switching}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  currentLocation === loc
                    ? "bg-[#C8102E] text-white border-[#C8102E]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#C8102E] hover:text-[#C8102E]"
                }`}
              >
                📍 {loc}
              </button>
            ))}
          </div>
        </div>
        {children}
      </div>
    </>
  );
}

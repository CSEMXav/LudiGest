"use client";

import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LOCATIONS } from "@ludigest/types";
import { useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession();
  const pathname = usePathname();
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

  const navItems = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/games", label: "Jeux" },
    { href: "/admin/loans", label: "Emprunts" },
    { href: "/admin/users", label: "Utilisateurs" },
    { href: "/admin/sessions", label: "🎲 Sessions" },
    { href: "/admin/email-settings", label: "📧 Emails" },
    { href: "/admin/import", label: "Import Excel" },
  ];

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Barre de navigation admin */}
        <div className="mb-6 space-y-3">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <nav className="flex gap-1 border-b border-gray-200 pb-0 min-w-max sm:min-w-0">
              {navItems.map((item) => {
                const active = item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                      active
                        ? "border-[#C8102E] text-[#C8102E]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sélecteur de ludothèque */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 flex-shrink-0">Ludothèque :</span>
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

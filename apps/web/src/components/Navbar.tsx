"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LOCATIONS } from "@ludigest/types";

export function Navbar() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function switchLocation(loc: string) {
    setSwitching(true);
    await fetch("/api/user/location", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: loc }),
    });
    await update({ location: loc });
    setSwitching(false);
    setMenuOpen(false);
  }

  const linkClass = (href: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname.startsWith(href)
        ? "bg-red-700 text-white"
        : "text-red-100 hover:bg-red-700 hover:text-white"
    }`;

  const mobileLinkClass = (href: string) =>
    `block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      pathname.startsWith(href)
        ? "bg-red-700 text-white"
        : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <nav className="bg-[#C8102E] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + liens desktop */}
          <div className="flex items-center gap-6">
            <Link href="/games" className="text-white font-bold text-xl flex-shrink-0">
              LudiGest
            </Link>
            {session && (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/games" className={linkClass("/games")}>Jeux</Link>
                <Link href="/loans" className={linkClass("/loans")}>Mes emprunts</Link>
                {session.user.role === "ADMIN" && (
                  <Link href="/admin" className={linkClass("/admin")}>Administration</Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Profil desktop */}
            {session && (
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-red-100 hover:text-white text-sm px-3 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  <span className="max-w-[140px] truncate">👤 {session.user.name}</span>
                  <span className="text-xs opacity-70">▾</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      {session.user.role === "ADMIN" && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                          Administrateur
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Ma ludothèque</p>
                      <div className="flex gap-2">
                        {LOCATIONS.map((loc) => (
                          <button
                            key={loc}
                            onClick={() => switchLocation(loc)}
                            disabled={switching}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${
                              session.user.location === loc
                                ? "bg-[#C8102E] text-white border-[#C8102E]"
                                : "border-gray-200 text-gray-600 hover:border-red-300"
                            }`}
                          >
                            📍 {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger mobile */}
            {session && (
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="sm:hidden text-white p-2 rounded-md hover:bg-red-700 transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}

            {!session && (
              <Link href="/login" className="text-red-100 hover:text-white text-sm">
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {session && mobileOpen && (
        <div className="sm:hidden border-t border-red-700 bg-white">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-semibold text-gray-900 text-sm truncate">{session.user.name}</p>
            <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
          </div>
          <div className="px-3 py-2 space-y-1">
            <Link href="/games" className={mobileLinkClass("/games")}>🎲 Jeux</Link>
            <Link href="/loans" className={mobileLinkClass("/loans")}>📋 Mes emprunts</Link>
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className={mobileLinkClass("/admin")}>⚙️ Administration</Link>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">Ma ludothèque</p>
            <div className="flex gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => switchLocation(loc)}
                  disabled={switching}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-colors ${
                    session.user.location === loc
                      ? "bg-[#C8102E] text-white border-[#C8102E]"
                      : "border-gray-200 text-gray-600 hover:border-red-300"
                  }`}
                >
                  📍 {loc}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 py-2 border-t border-gray-100">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

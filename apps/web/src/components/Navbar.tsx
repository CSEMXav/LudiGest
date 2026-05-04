"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LOCATIONS } from "@ludigest/types";

const NAV_ITEMS = [
  { label: "Accueil",      href: "/",         id: "home"     },
  { label: "Catalogue",    href: "/games",    id: "games"    },
  { label: "Mes emprunts", href: "/loans",    id: "loans"    },
  { label: "Soirées",      href: "/sessions", id: "sessions" },
  { label: "Membres",      href: "/members",  id: "members"  },
];

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Navbar() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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

  function isActive(href: string, id: string): boolean {
    if (id === "home") return pathname === "/";
    return pathname.startsWith(href);
  }

  const location = (session?.user as { location?: string })?.location ?? "";
  const initials = getInitials(session?.user?.name);

  return (
    <>
      {/* ── Desktop bar ── */}
      <header
        className="hidden sm:flex items-center gap-4 px-8 h-[66px] flex-shrink-0"
        style={{ background: "#fff", borderBottom: "1px solid var(--p-rule)" }}
      >
        {/* Logo + wordmark */}
        <Link href="/games" className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="flex items-center justify-center text-white font-display font-bold"
            style={{ width: 34, height: 34, borderRadius: 9, background: "var(--p-primary)", fontSize: 19 }}
          >
            L
          </div>
          <span
            className="font-display font-bold"
            style={{ fontSize: 20, letterSpacing: -0.4, color: "var(--p-ink)" }}
          >
            Ludigest
          </span>
        </Link>

        {/* Pill nav */}
        {session && (
          <nav className="flex items-center gap-1 ml-6">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.id);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="px-4 py-2 rounded-full text-[13px] transition-colors"
                  style={{
                    fontWeight: active ? 700 : 500,
                    background: active ? "var(--p-ink)" : "transparent",
                    color: active ? "#fff" : "var(--p-ink2)",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,.04)"; }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                >
                  {item.label}
                </Link>
              );
            })}
            {session.user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="px-4 py-2 rounded-full text-[13px] transition-colors"
                style={{
                  fontWeight: pathname.startsWith("/admin") ? 700 : 500,
                  background: pathname.startsWith("/admin") ? "var(--p-ink)" : "transparent",
                  color: pathname.startsWith("/admin") ? "#fff" : "var(--p-ink2)",
                }}
              >
                Admin
              </Link>
            )}
          </nav>
        )}

        <div className="flex-1" />

        {session && (
          <div className="flex items-center gap-3">
            {/* Location pill */}
            {location && (
              <div
                className="inline-flex items-center gap-1.5 text-[12px] font-bold rounded-full px-3 py-[5px]"
                style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}
              >
                📍 {location}
              </div>
            )}

            {/* Avatar with dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center justify-center font-bold rounded-full text-[13px] transition-colors"
                style={{
                  width: 36, height: 36,
                  background: "var(--p-ocre)",
                  color: "var(--p-ink)",
                }}
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-xl z-50 overflow-hidden"
                  style={{ background: "#fff", border: "1.5px solid var(--p-rule)" }}>
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--p-rule)" }}>
                    <p className="font-semibold text-sm" style={{ color: "var(--p-ink)" }}>{session.user.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>{session.user.email}</p>
                    {session.user.role === "ADMIN" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
                        style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}>
                        Administrateur
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--p-rule)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--p-ink3)" }}>Ma ludothèque</p>
                    <div className="flex gap-2">
                      {LOCATIONS.map((loc) => (
                        <button
                          key={loc}
                          onClick={() => switchLocation(loc)}
                          disabled={switching}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                          style={{
                            border: `1.5px solid ${location === loc ? "var(--p-primary)" : "var(--p-rule)"}`,
                            background: location === loc ? "var(--p-primary)" : "#fff",
                            color: location === loc ? "#fff" : "var(--p-ink2)",
                          }}
                        >
                          📍 {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm transition-colors"
                    style={{ color: "var(--p-ink2)" }}
                  >
                    Mon compte
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full text-left px-4 py-3 text-sm font-medium transition-colors"
                    style={{ color: "var(--p-primary)", borderTop: "1px solid var(--p-rule)" }}
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!session && (
          <Link href="/login" className="text-sm" style={{ color: "var(--p-ink2)" }}>Connexion</Link>
        )}
      </header>

      {/* ── Mobile bar ── */}
      <header
        className="sm:hidden flex items-center justify-between px-4 h-14"
        style={{ background: "#fff", borderBottom: "1px solid var(--p-rule)" }}
      >
        <Link href="/games" className="flex items-center gap-2">
          <div
            className="flex items-center justify-center text-white font-display font-bold"
            style={{ width: 30, height: 30, borderRadius: 8, background: "var(--p-primary)", fontSize: 17 }}
          >
            L
          </div>
          <span className="font-display font-bold" style={{ fontSize: 18, letterSpacing: -0.3, color: "var(--p-ink)" }}>
            Ludigest
          </span>
        </Link>

        {session && (
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg"
            style={{ color: "var(--p-ink2)" }}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        )}
      </header>

      {/* Mobile menu */}
      {session && mobileOpen && (
        <div className="sm:hidden" style={{ background: "#fff", borderBottom: "1px solid var(--p-rule)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--p-rule)", background: "var(--p-bg)" }}>
            <p className="font-semibold text-sm" style={{ color: "var(--p-ink)" }}>{session.user.name}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>{session.user.email}</p>
          </div>
          <nav className="px-3 py-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href, item.id);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: active ? "var(--p-ink)" : "transparent",
                    color: active ? "#fff" : "var(--p-ink2)",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className="block px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ color: "var(--p-ink2)" }}>
                Administration
              </Link>
            )}
          </nav>
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--p-rule)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--p-ink3)" }}>Ma ludothèque</p>
            <div className="flex gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => switchLocation(loc)}
                  disabled={switching}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    border: `1.5px solid ${location === loc ? "var(--p-primary)" : "var(--p-rule)"}`,
                    background: location === loc ? "var(--p-primary)" : "#fff",
                    color: location === loc ? "#fff" : "var(--p-ink2)",
                  }}
                >
                  📍 {loc}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 py-2" style={{ borderTop: "1px solid var(--p-rule)" }}>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl transition-colors"
              style={{ color: "var(--p-primary)" }}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </>
  );
}

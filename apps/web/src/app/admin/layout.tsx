"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { LOCATIONS } from "@ludigest/types";
import { useState } from "react";

const SIDEBAR_ITEMS = [
  { href: "/games",    label: "Jeux",     icon: <DieIcon /> },
  { href: "/loans",    label: "Emprunts", icon: <CardIcon /> },
  { href: "/members",  label: "Membres",  icon: <MeepleIcon /> },
  { href: "/sessions", label: "Soirées",  icon: <StarIcon /> },
];

const ADMIN_TABS = [
  { href: "/admin",                label: "Tableau de bord", exact: true },
  { href: "/admin/games",          label: "Jeux" },
  { href: "/admin/loans",          label: "Emprunts" },
  { href: "/admin/users",          label: "Utilisateurs" },
  { href: "/admin/sessions",       label: "Soirées" },
  { href: "/admin/email-settings", label: "Emails" },
  { href: "/admin/import",         label: "Import" },
];

function DieIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 56 56" style={{ display: "block" }}>
      <rect x="12" y="12" width="32" height="32" rx="5" fill="currentColor" opacity="0.7" />
      <circle cx="20" cy="20" r="2.8" fill="white" />
      <circle cx="36" cy="20" r="2.8" fill="white" />
      <circle cx="28" cy="28" r="2.8" fill="white" />
      <circle cx="20" cy="36" r="2.8" fill="white" />
      <circle cx="36" cy="36" r="2.8" fill="white" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 56 56" style={{ display: "block" }}>
      <rect x="14" y="10" width="22" height="32" rx="3" fill="currentColor" opacity="0.5" transform="rotate(-8 25 26)" />
      <rect x="20" y="14" width="22" height="32" rx="3" fill="currentColor" opacity="0.8" transform="rotate(8 31 30)" />
    </svg>
  );
}
function MeepleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 56 56" style={{ display: "block" }}>
      <path d="M28 8c3 0 5 2 5 5s-2 5-5 5c-1 0-2 0-3 1l-7-3c-1 0-3 1-3 3s1 3 3 4l5 1-3 14c0 2 1 3 3 3s3-1 3-3l1-7h2l1 7c0 2 1 3 3 3s3-1 3-3l-3-14 5-1c2-1 3-2 3-4s-2-3-3-3l-7 3c-1-1-2-1-3-1-3 0-5-2-5-5s2-5 5-5z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 56 56" style={{ display: "block" }}>
      <polygon points="28,10 33,22 46,22 35,30 39,43 28,35 17,43 21,30 10,22 23,22" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

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
  const initials = session?.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--p-bg)" }}>
      {/* ── Sidebar dark ── */}
      <aside
        style={{
          width: 76,
          background: "var(--p-bg-alt)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 0",
          gap: 6,
          flexShrink: 0,
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 40,
        }}
      >
        {/* Logo */}
        <Link
          href="/admin"
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: "var(--p-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
            fontFamily: "var(--font-display, system-ui)",
            fontWeight: 700, fontSize: 22,
            marginBottom: 16, textDecoration: "none",
          }}
        >
          L
        </Link>

        {/* Nav items */}
        {SIDEBAR_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                width: 52, height: 52, borderRadius: 12,
                background: active ? "rgba(255,255,255,0.1)" : "transparent",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, textDecoration: "none",
                color: active ? "#fff" : "rgba(245,233,216,0.5)",
              }}
            >
              {item.icon}
              <span style={{ fontSize: 9, fontWeight: 600 }}>{item.label}</span>
            </Link>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Avatar / sign-out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Se déconnecter"
          style={{
            width: 36, height: 36, borderRadius: 18,
            background: "var(--p-ocre)",
            color: "var(--p-bg-alt)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer",
          }}
        >
          {initials}
        </button>
      </aside>

      {/* ── Main column ── */}
      <main style={{ flex: 1, marginLeft: 76, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Topbar */}
        <div style={{ borderBottom: "1px solid var(--p-rule)", background: "var(--p-bg)" }}>
          {/* Location row */}
          <div style={{ padding: "14px 32px 0", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 700,
                color: "var(--p-ink3)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Ludothèque
            </span>
            {LOCATIONS.map((loc) => {
              const on = currentLocation === loc;
              return (
                <button
                  key={loc}
                  onClick={() => switchLocation(loc)}
                  disabled={switching}
                  style={{
                    padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                    background: on ? "var(--p-ink)" : "transparent",
                    color: on ? "#fff" : "var(--p-ink2)",
                    border: `1.5px solid ${on ? "var(--p-ink)" : "var(--p-rule)"}`,
                    cursor: "pointer",
                  }}
                >
                  📍 {loc}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "var(--p-ink2)" }}>{session?.user.email}</span>
          </div>

          {/* Admin tabs */}
          <div style={{ display: "flex", gap: 4, padding: "0 32px", overflowX: "auto" }}>
            {ADMIN_TABS.map((tab) => {
              const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  style={{
                    padding: "10px 16px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                    borderBottom: `2px solid ${active ? "var(--p-primary)" : "transparent"}`,
                    color: active ? "var(--p-primary)" : "var(--p-ink3)",
                    marginBottom: -1, textDecoration: "none",
                    display: "inline-block",
                    transition: "color .15s",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: "28px 32px 48px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

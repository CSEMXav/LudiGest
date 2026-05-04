"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import type { UserNotificationDTO } from "@ludigest/types";

interface UserProfile {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  nickname: string | null;
  visibleInMembers: boolean;
  matricule: string | null;
  role: string;
  location: string;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-6 rounded-full transition-colors" style={{ background: checked ? "var(--p-primary)" : "var(--p-rule)" }} />
      <div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
        style={{ left: checked ? "22px" : "4px" }}
      />
    </label>
  );
}

function NotifBadge({ type }: { type: string }) {
  if (type === "SESSION_INVITE")   return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#dee9f3", color: "var(--p-bleu)" }}>Invitation</span>;
  if (type === "SESSION_REMINDER") return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fcebd2", color: "#7d4a0d" }}>Rappel session</span>;
  if (type === "GAME_REPORT")      return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--p-primary-soft)", color: "#7c2410" }}>Signalement</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#7d4a0d" }}>Rappel emprunt</span>;
}

function UnreadDot() {
  return <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: "var(--p-primary)" }} />;
}

export default function AccountPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [visibleInMembers, setVisibleInMembers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [notifications, setNotifications] = useState<UserNotificationDTO[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d: UserProfile) => {
        setProfile(d);
        setFirstName(d.firstName ?? "");
        setLastName(d.lastName ?? "");
        setNickname(d.nickname ?? "");
        setVisibleInMembers(d.visibleInMembers);
      });

    fetch("/api/user/notifications")
      .then((r) => r.json())
      .then((d) => { setNotifications(Array.isArray(d) ? d : []); setNotifsLoading(false); });
  }, []);

  async function saveProfile() {
    setSaving(true);
    setSavedMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: firstName.trim() || null, lastName: lastName.trim() || null, nickname: nickname.trim() || null, visibleInMembers }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      if (updated.name) setProfile((p) => p ? { ...p, name: updated.name, firstName: updated.firstName, lastName: updated.lastName } : p);
      setSavedMsg("Profil mis à jour !");
      setTimeout(() => setSavedMsg(""), 3000);
    }
  }

  const initials = profile?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse" style={{ color: "var(--p-ink3)" }}>Chargement...</div>
        </div>
      </>
    );
  }

  const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors";

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--p-ink3)" }}>Espace personnel</p>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-6" style={{ color: "var(--p-ink)" }}>Mon compte</h1>

        {/* Hero card */}
        <div className="rounded-2xl p-7 mb-5 flex items-center gap-6 relative overflow-hidden" style={{ background: "var(--p-bg-alt)", color: "#fff" }}>
          {/* Hexagon pattern */}
          <svg width="200" height="150" viewBox="0 0 200 150" className="absolute right-0 top-0 opacity-10 pointer-events-none">
            {[0,1,2].map(r => [0,1,2,3].map(c => (
              <polygon key={`${r}-${c}`} points="20,2 36,12 36,30 20,40 4,30 4,12"
                transform={`translate(${c*34+(r%2)*17} ${r*30+10})`}
                fill="none" stroke="#fff" strokeWidth="1.4"/>
            )))}
          </svg>
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex-shrink-0 flex items-center justify-center font-display text-3xl font-bold"
            style={{ background: "var(--p-ocre)", color: "var(--p-bg-alt)" }}
          >
            {initials}
          </div>
          <div className="relative z-10">
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--p-ocre)" }}>
              {profile.role === "ADMIN" ? "Administrateur" : "Membre"} · {profile.location}
            </div>
            <div className="font-display text-3xl font-bold leading-tight">{profile.name}</div>
            <div className="text-sm mt-1 opacity-75">{profile.email}</div>
            {profile.matricule && (
              <div className="text-xs mt-2 opacity-60">Matricule : {profile.matricule}</div>
            )}
          </div>
        </div>

        {/* 2-col form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Identity */}
          <section className="rounded-2xl p-6" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
            <h2 className="font-display text-xl font-bold mb-1" style={{ color: "var(--p-ink)" }}>Identité</h2>
            <p className="text-xs mb-5" style={{ color: "var(--p-ink3)" }}>Vos informations publiques.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Email · verrouillé</label>
                <div className="rounded-xl px-3 py-2.5 text-sm font-mono" style={{ background: "var(--p-bg)", color: "var(--p-ink3)", border: "1.5px solid var(--p-rule)" }}>
                  {profile.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Prénom</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>Nom</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--p-ink3)" }}>
                  Surnom <span className="normal-case font-normal">(liste des membres)</span>
                </label>
                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                  placeholder={profile.email}
                  className={inputCls} style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink)" }} />
              </div>
            </div>
            {savedMsg && <p className="text-sm font-semibold mt-3" style={{ color: "var(--p-vert)" }}>{savedMsg}</p>}
            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-4 px-5 py-2.5 rounded-full text-sm font-bold text-white disabled:opacity-50 transition-colors"
              style={{ background: "var(--p-ink)" }}
            >
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </section>

          {/* Preferences */}
          <section className="rounded-2xl p-6" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
            <h2 className="font-display text-xl font-bold mb-1" style={{ color: "var(--p-ink)" }}>Préférences</h2>
            <p className="text-xs mb-5" style={{ color: "var(--p-ink3)" }}>Visibilité et notifications.</p>
            <div className="space-y-0">
              <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid var(--p-rule)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--p-ink)" }}>Visible dans les membres</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>Surnom et emprunts visibles par les autres.</p>
                </div>
                <ToggleSwitch checked={visibleInMembers} onChange={setVisibleInMembers} />
              </div>
            </div>
          </section>
        </div>

        {/* Notification history */}
        <div className="rounded-2xl p-6" style={{ background: "var(--p-card)", border: "1px solid var(--p-rule)" }}>
          <h2 className="font-display text-xl font-bold mb-4" style={{ color: "var(--p-ink)" }}>📬 Notifications</h2>

          {notifsLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--p-bg)" }} />)}</div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--p-ink3)" }}>Aucune notification reçue.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{
                    background: n.read ? "var(--p-bg)" : "var(--p-primary-soft)",
                    border: n.read ? "none" : "1px solid #f9c5b5",
                  }}
                >
                  {!n.read && <UnreadDot />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <NotifBadge type={n.type} />
                      <span className="text-xs" style={{ color: "var(--p-ink3)" }}>
                        {new Date(n.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      {!n.read && <span className="text-xs font-semibold" style={{ color: "var(--p-primary)" }}>Nouveau</span>}
                    </div>
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--p-ink)" }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--p-ink2)" }}>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

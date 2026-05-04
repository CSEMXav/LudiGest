"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import type { UserNotificationDTO } from "@ludigest/types";

interface UserProfile {
  id: string;
  name: string;
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
      <div className="w-10 h-6 bg-gray-200 peer-checked:bg-[#C8102E] rounded-full transition-colors" />
      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}

function NotifBadge({ type }: { type: string }) {
  if (type === "SESSION_INVITE") return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Invitation</span>;
  if (type === "SESSION_REMINDER") return <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Rappel session</span>;
  if (type === "GAME_REPORT") return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Signalement jeu</span>;
  return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Rappel emprunt</span>;
}

function UnreadDot() {
  return <span className="w-2 h-2 rounded-full bg-[#C8102E] flex-shrink-0 mt-1" />;
}

export default function AccountPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
      body: JSON.stringify({ nickname: nickname.trim() || null, visibleInMembers }),
    });
    setSaving(false);
    if (res.ok) {
      setSavedMsg("Profil mis à jour !");
      setTimeout(() => setSavedMsg(""), 3000);
    }
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon compte</h1>

        {/* Identity card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-2xl">👤</div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {profile.role === "ADMIN" && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">Administrateur</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Matricule — read only */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Matricule</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                {profile.matricule ?? <span className="text-gray-400">Non renseigné</span>}
              </div>
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Surnom <span className="text-gray-400 font-normal">(affiché dans la liste des membres)</span></label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={profile.email}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>

            {/* Visible in members */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Visible dans la liste des membres</p>
                <p className="text-xs text-gray-400">Votre surnom et nombre d&apos;emprunts seront visibles par les autres membres.</p>
              </div>
              <ToggleSwitch checked={visibleInMembers} onChange={setVisibleInMembers} />
            </div>

            {savedMsg && <p className="text-sm text-green-600 font-medium">{savedMsg}</p>}

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-[#C8102E] text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
            >
              {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
            </button>
          </div>
        </div>

        {/* Notification history */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">📬 Historique des notifications</h2>

          {notifsLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : notifications.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucune notification reçue.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl ${n.read ? "bg-gray-50" : "bg-red-50 border border-red-100"}`}>
                  {!n.read && <UnreadDot />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <NotifBadge type={n.type} />
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {!n.read && <span className="text-xs text-[#C8102E] font-medium">Nouveau</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
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

"use client";

import { useEffect, useState } from "react";
import type { UserAdminDTO } from "@ludigest/types";

interface LoanItem {
  id: string;
  gameId: string;
  gameName: string;
  gameCoverUrl?: string | null;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  extendedCount: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function UserLoansModal({ user, onClose }: { user: UserAdminDTO; onClose: () => void }) {
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/loans`)
      .then((r) => r.json())
      .then((d) => { setLoans(Array.isArray(d) ? d : []); setLoading(false); });
  }, [user.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{user.name}</h2>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : loans.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun emprunt.</p>
          ) : (
            <div className="space-y-3">
              {loans.map((l) => (
                <div key={l.id} className="bg-gray-50 rounded-xl p-3 text-sm flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    {l.gameCoverUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={l.gameCoverUrl} alt={l.gameName} className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center h-full text-lg">🎲</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{l.gameName}</p>
                    <p className="text-xs text-gray-500">
                      Du {formatDate(l.borrowedAt)}
                      {l.returnedAt ? ` au ${formatDate(l.returnedAt)}` : ` · À rendre le ${formatDate(l.dueAt)}`}
                      {l.extendedCount > 0 && ` · Prolongé ${l.extendedCount}x`}
                    </p>
                  </div>
                  {l.returnedAt
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full self-start">Rendu</span>
                    : <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full self-start">En cours</span>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAdminDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserAdminDTO | null>(null);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function toggleRole(user: UserAdminDTO) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setActionMsg((m) => ({ ...m, [user.id]: `Rôle → ${newRole}` }));
      loadUsers();
    }
  }

  async function toggleSuspend(user: UserAdminDTO) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: !user.suspended }),
    });
    if (res.ok) {
      setActionMsg((m) => ({ ...m, [user.id]: user.suspended ? "Compte réactivé" : "Compte suspendu" }));
      loadUsers();
    }
  }

  function exportExcel() {
    window.location.href = "/api/admin/users/export";
  }

  if (loading) return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white rounded-xl" />)}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs inscrits</h1>
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
        >
          📥 Exporter Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Utilisateur</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Matricule</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Ludothèque</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Inscription</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Emprunts</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">En cours</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Rôle</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr
                key={u.id}
                className={`hover:bg-gray-50 transition-colors ${u.suspended ? "opacity-60" : ""}`}
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="text-left hover:text-[#C8102E] transition-colors"
                  >
                    <p className="font-medium text-gray-900">
                      {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name}
                    </p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    {!u.emailVerified && (
                      <span className="text-xs text-yellow-600">⚠ Email non vérifié</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.matricule ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-600">📍 {u.location}</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-center font-medium text-gray-700">{u.totalLoans}</td>
                <td className="px-4 py-3 text-center">
                  {u.activeLoans > 0
                    ? <span className="inline-block bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">{u.activeLoans}</span>
                    : <span className="text-gray-400">0</span>
                  }
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${u.suspended ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {u.suspended ? "Suspendu" : "Actif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    {actionMsg[u.id] && (
                      <span className="text-xs text-green-600">{actionMsg[u.id]}</span>
                    )}
                    <button
                      onClick={() => toggleRole(u)}
                      title={u.role === "ADMIN" ? "Rétrograder en USER" : "Promouvoir en ADMIN"}
                      className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                    >
                      {u.role === "ADMIN" ? "⬇" : "⬆"}
                    </button>
                    <button
                      onClick={() => toggleSuspend(u)}
                      title={u.suspended ? "Réactiver" : "Suspendre"}
                      className={`p-1.5 rounded-lg transition-colors ${u.suspended ? "hover:bg-green-50 text-green-600" : "hover:bg-red-50 text-red-600"}`}
                    >
                      {u.suspended ? "✓" : "⊘"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="text-center py-12 text-gray-400">Aucun utilisateur inscrit.</p>
        )}
      </div>

      {selectedUser && (
        <UserLoansModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

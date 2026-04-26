"use client";

import { useEffect, useState } from "react";
import type { LoanDTO } from "@ludigest/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<LoanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function loadLoans() {
    const res = await fetch(`/api/admin/loans?active=${activeOnly}`);
    setLoans(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadLoans(); }, [activeOnly]);

  async function forceReturn(loanId: string) {
    const res = await fetch(`/api/admin/loans/${loanId}/return`, { method: "POST" });
    setMessages((m) => ({ ...m, [loanId]: res.ok ? "Rendu !" : "Erreur" }));
    if (res.ok) loadLoans();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des emprunts</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="rounded" />
          Emprunts actifs uniquement
        </label>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-left">Jeu</th>
                <th className="px-4 py-3 text-left">Emprunté le</th>
                <th className="px-4 py-3 text-left">À rendre le</th>
                <th className="px-4 py-3 text-left">Rendu le</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans.map((l) => {
                const overdue = !l.returnedAt && new Date(l.dueAt) < new Date();
                return (
                  <tr key={l.id} className={overdue ? "bg-red-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{l.userName}</div>
                      <div className="text-gray-400 text-xs">{l.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{l.gameName}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(l.borrowedAt)}</td>
                    <td className={`px-4 py-3 font-medium ${overdue ? "text-red-600" : "text-gray-700"}`}>
                      {formatDate(l.dueAt)}{overdue && " ⚠"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{l.returnedAt ? formatDate(l.returnedAt) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {!l.returnedAt && (
                        <button
                          onClick={() => forceReturn(l.id)}
                          className="text-xs px-3 py-1 bg-[#C8102E] text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          {messages[l.id] ?? "Forcer retour"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loans.length === 0 && <p className="text-center py-8 text-gray-400">Aucun emprunt.</p>}
        </div>
      )}
    </div>
  );
}

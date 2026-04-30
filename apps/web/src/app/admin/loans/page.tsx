"use client";

import { useEffect, useState, useMemo } from "react";
import type { LoanDTO } from "@ludigest/types";

interface ReminderLog {
  type: "reminder" | "overdue";
  sentAt: string;
}

interface AdminLoanDTO extends LoanDTO {
  wasLate: boolean;
  reminders: ReminderLog[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type SortKey = "userName" | "borrowedAt" | "dueAt" | "returnedAt";
type SortDir = "asc" | "desc";

function ReminderIcon({ reminders }: { reminders: ReminderLog[] }) {
  const hasReminders = reminders.length > 0;
  return (
    <div className="relative group/tooltip">
      <button
        className={`text-base leading-none transition-colors ${
          hasReminders ? "text-blue-400 hover:text-blue-600" : "text-gray-200 hover:text-gray-300"
        }`}
        title={hasReminders ? `${reminders.length} rappel(s) envoyé(s)` : "Aucun rappel envoyé"}
      >
        📬
      </button>
      {/* Tooltip */}
      <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-20 w-56 bg-gray-900 text-white rounded-lg shadow-xl text-xs p-3">
        {hasReminders ? (
          <>
            <p className="font-semibold mb-2 text-gray-300">{reminders.length} rappel(s) envoyé(s)</p>
            <ul className="space-y-1.5">
              {reminders.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={r.type === "overdue" ? "text-red-400" : "text-blue-400"}>
                    {r.type === "overdue" ? "⚠️" : "📧"}
                  </span>
                  <span>
                    <span className="font-medium">{r.type === "overdue" ? "Retard" : "Rappel"}</span>
                    <br />
                    <span className="text-gray-400">{formatDateTime(r.sentAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-gray-400">Aucun email de rappel envoyé pour cet emprunt.</p>
        )}
        {/* Arrow */}
        <div className="absolute bottom-[-4px] right-3 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

export default function AdminLoansPage() {
  const [loans, setLoans] = useState<AdminLoanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("borrowedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function loadLoans() {
    setLoading(true);
    const res = await fetch(`/api/admin/loans?active=${activeOnly}`);
    setLoans(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadLoans(); }, [activeOnly]);

  async function forceReturn(loanId: string) {
    const res = await fetch(`/api/admin/loans/${loanId}/return`, { method: "POST" });
    setMessages((m) => ({ ...m, [loanId]: res.ok ? "✓ Rendu" : "Erreur" }));
    if (res.ok) loadLoans();
  }

  async function sendReminder(loanId: string) {
    setMessages((m) => ({ ...m, [loanId]: "Envoi..." }));
    const res = await fetch(`/api/admin/loans/${loanId}/remind`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setMessages((m) => ({ ...m, [loanId]: data.type === "overdue" ? "✓ Mail retard envoyé" : "✓ Mail rappel envoyé" }));
      loadLoans();
    } else {
      setMessages((m) => ({ ...m, [loanId]: data.error ?? "Erreur envoi" }));
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-[#C8102E] ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const now = new Date();

  const filtered = useMemo(() => {
    let result = loans;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((l) =>
        (l.userName?.toLowerCase() ?? "").includes(q) || (l.userEmail?.toLowerCase() ?? "").includes(q)
      );
    }
    if (overdueOnly) {
      result = result.filter((l) => l.wasLate);
    }
    return [...result].sort((a, b) => {
      let va: string, vb: string;
      if (sortKey === "userName") { va = a.userName ?? ""; vb = b.userName ?? ""; }
      else if (sortKey === "borrowedAt") { va = a.borrowedAt; vb = b.borrowedAt; }
      else if (sortKey === "dueAt") { va = a.dueAt; vb = b.dueAt; }
      else { va = a.returnedAt ?? ""; vb = b.returnedAt ?? ""; }
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [loans, search, overdueOnly, sortKey, sortDir]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des emprunts</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setOverdueOnly(false); }} className="rounded" />
            Actifs uniquement
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="rounded" />
            En retard uniquement
          </label>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Rechercher par nom ou email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-xl px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
      />

      {loading ? (
        <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-white rounded-xl" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("userName")}>
                  Utilisateur <SortIcon k="userName" />
                </th>
                <th className="px-4 py-3 text-left">Jeu</th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("borrowedAt")}>
                  Emprunté <SortIcon k="borrowedAt" />
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("dueAt")}>
                  À rendre <SortIcon k="dueAt" />
                </th>
                <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => toggleSort("returnedAt")}>
                  Rendu le <SortIcon k="returnedAt" />
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => {
                const isCurrentlyOverdue = !l.returnedAt && new Date(l.dueAt) < now;
                const wasReturnedLate = !!l.returnedAt && new Date(l.returnedAt) > new Date(l.dueAt);
                const showLateIcon = isCurrentlyOverdue || wasReturnedLate;

                return (
                  <tr key={l.id} className={isCurrentlyOverdue ? "bg-red-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{l.userName}</div>
                      <div className="text-gray-400 text-xs">{l.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{l.gameName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(l.borrowedAt)}</td>
                    <td className={`px-4 py-3 text-xs font-medium ${isCurrentlyOverdue ? "text-red-600" : "text-gray-700"}`}>
                      {formatDate(l.dueAt)}
                      {showLateIcon && (
                        <span title={wasReturnedLate ? "Rendu en retard" : "En retard"} className="ml-1">
                          {wasReturnedLate ? "🔴" : "⚠️"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {l.returnedAt ? formatDate(l.returnedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1.5 justify-end flex-wrap items-center">
                        {messages[l.id] && (
                          <span className="text-xs text-green-600 self-center">{messages[l.id]}</span>
                        )}
                        <ReminderIcon reminders={l.reminders} />
                        {!l.returnedAt && (
                          <>
                            <button
                              onClick={() => sendReminder(l.id)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                                isCurrentlyOverdue
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-blue-200 text-blue-600 hover:bg-blue-50"
                              }`}
                              title={isCurrentlyOverdue ? "Envoyer un mail de retard" : "Envoyer un rappel"}
                            >
                              {isCurrentlyOverdue ? "📧 Retard" : "📧 Rappel"}
                            </button>
                            <button
                              onClick={() => forceReturn(l.id)}
                              className="text-xs px-2.5 py-1 bg-[#C8102E] text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Forcer retour
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-8 text-gray-400">Aucun emprunt{search ? " correspondant" : ""}.</p>
          )}
        </div>
      )}
    </div>
  );
}

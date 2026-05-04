"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LoanDTO } from "@ludigest/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function isOverdue(dueAt: string) {
  return new Date(dueAt) < new Date();
}

function isDueSoon(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  return ms > 0 && ms <= 7 * 24 * 60 * 60 * 1000;
}

function ReturnModal({ loan, onConfirm, onCancel }: { loan: LoanDTO; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-2xl w-full max-w-md shadow-xl p-6" style={{ background: "var(--p-card)" }}>
        <h2 className="text-lg font-bold mb-3" style={{ color: "var(--p-ink)" }}>
          Rendre &ldquo;{loan.gameName}&rdquo; ?
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--p-ink2)" }}>
          Merci de ranger le jeu correctement dans sa boîte avant de le rendre, et de tenir compte de sa catégorie/couleur pour le ranger dans la section correspondante.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)" }}
          >
            Non, annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--p-primary)" }}
          >
            Oui, rendre
          </button>
        </div>
      </div>
    </div>
  );
}

function LoanCard({
  loan,
  active,
  onAction,
  message,
}: {
  loan: LoanDTO;
  active: boolean;
  onAction?: (type: "return" | "extend") => void;
  message?: string;
}) {
  const overdue = active && isOverdue(loan.dueAt);
  const dueSoon = active && !overdue && isDueSoon(loan.dueAt);

  const cardStyle = overdue
    ? { background: "#fbebe9", borderColor: "var(--p-primary)" }
    : dueSoon
    ? { background: "#fdf6e3", borderColor: "var(--p-ocre)" }
    : { background: "var(--p-card)", borderColor: "var(--p-rule)" };

  return (
    <div className="rounded-xl p-4 flex gap-4 items-start" style={{ border: "1.5px solid", ...cardStyle }}>
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: loan.gameCoverUrl ? undefined : "var(--p-primary-soft)" }}>
        {loan.gameCoverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loan.gameCoverUrl} alt={loan.gameName} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: 24, opacity: 0.5 }}>🎲</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link href={`/games/${loan.gameId}`} className="font-semibold text-sm hover:underline"
          style={{ color: "var(--p-ink)" }}>
          {loan.gameName}
        </Link>

        {active ? (
          <>
            <p className="text-sm mt-0.5 font-medium" style={{
              color: overdue ? "var(--p-primary)" : dueSoon ? "#a07000" : "var(--p-ink3)"
            }}>
              {overdue ? "⚠ En retard — " : dueSoon ? "⏰ À rendre bientôt — " : "À rendre avant le "}
              {formatDate(loan.dueAt)}
            </p>
            {loan.extendedCount > 0 && (
              <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "var(--p-primary-soft)", color: "var(--p-primary)" }}>
                Prolongé {loan.extendedCount}x
              </span>
            )}
          </>
        ) : (
          <p className="text-sm mt-0.5" style={{ color: "var(--p-ink3)" }}>
            Rendu le {formatDate(loan.returnedAt!)}
          </p>
        )}

        <p className="text-xs mt-0.5" style={{ color: "var(--p-ink3)" }}>Emprunté le {formatDate(loan.borrowedAt)}</p>

        {message && (
          <p className="text-sm mt-1" style={{
            color: message.includes("Erreur") || message.includes("erreur") || message.includes("maximum")
              ? "var(--p-primary)"
              : "#3a6a3e"
          }}>
            {message}
          </p>
        )}

        {active && onAction && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onAction("return")}
              className="px-3 py-1.5 text-white rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--p-primary)" }}
            >
              Rendre
            </button>
            {loan.extendedCount < 3 && (
              <button
                onClick={() => onAction("extend")}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ border: "1.5px solid var(--p-rule)", color: "var(--p-ink2)", background: "var(--p-card)" }}
              >
                Prolonger (+1 semaine)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [returnConfirm, setReturnConfirm] = useState<LoanDTO | null>(null);

  async function loadLoans() {
    const res = await fetch("/api/loans?all=true");
    const data = await res.json();
    setLoans(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { loadLoans(); }, []);

  async function doReturn(loanId: string) {
    const res = await fetch(`/api/loans/${loanId}/return`, { method: "POST" });
    const data = await res.json();
    setMessages((m) => ({ ...m, [loanId]: res.ok ? "Jeu rendu !" : (data.error ?? "Erreur") }));
    if (res.ok) loadLoans();
  }

  async function doExtend(loanId: string) {
    const res = await fetch(`/api/loans/${loanId}/extend`, { method: "POST" });
    const data = await res.json();
    setMessages((m) => ({
      ...m,
      [loanId]: res.ok ? `Prolongé jusqu'au ${formatDate(data.dueAt)}` : (data.error ?? "Erreur"),
    }));
    if (res.ok) loadLoans();
  }

  function handleAction(loan: LoanDTO, type: "return" | "extend") {
    if (type === "return") {
      setReturnConfirm(loan);
    } else {
      doExtend(loan.id);
    }
  }

  const active = loans.filter((l) => !l.returnedAt);
  const history = loans.filter((l) => l.returnedAt);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "var(--p-card)" }} />
      ))}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--p-ink)", fontFamily: "var(--font-display, system-ui)" }}>Mes emprunts</h1>

      {active.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--p-ink3)" }}>
          <div className="text-5xl mb-4">📭</div>
          <p>Aucun emprunt en cours.</p>
          <Link href="/games" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--p-primary)" }}>
            Parcourir les jeux →
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: "var(--p-ink3)" }}>{active.length}/5 emprunts actifs</p>
          <div className="space-y-4">
            {active.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                active
                onAction={(type) => handleAction(loan, type)}
                message={messages[loan.id]}
              />
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold mb-4"
            style={{ color: "var(--p-ink2)" }}
          >
            <span className={`transition-transform ${showHistory ? "rotate-90" : ""}`}>▶</span>
            Historique des emprunts ({history.length})
          </button>

          {showHistory && (
            <div className="space-y-3">
              {history.map((loan) => (
                <LoanCard key={loan.id} loan={loan} active={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {returnConfirm && (
        <ReturnModal
          loan={returnConfirm}
          onConfirm={() => { doReturn(returnConfirm.id); setReturnConfirm(null); }}
          onCancel={() => setReturnConfirm(null)}
        />
      )}
    </div>
  );
}

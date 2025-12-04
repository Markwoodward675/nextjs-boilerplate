// app/transactions/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getUserTransactions } from "../../lib/api";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";

function useProtectedUser() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const u = await getCurrentUser();
        if (!u) {
          router.replace("/signin");
          return;
        }
        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checking };
}

export default function TransactionsPage() {
  const { user, checking } = useProtectedUser();
  const [transactions, setTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const txs = await getUserTransactions(user.$id);
        if (!cancelled) setTransactions(txs || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load transactions. Please try again shortly."
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (checking || loadingData) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading transactions…</div>
      </main>
    );
  }

  if (!user) return null;

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  const sorted = [...transactions].sort(
    (a, b) =>
      new Date(b.createdAt || b.$createdAt) -
      new Date(a.createdAt || a.$createdAt)
  );

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-slate-400">
            Full history of deposits, withdrawals, investments, trades, and
            bonus credits.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">
              No transactions yet. Once you deposit, invest, or trade, the full
              history will appear here.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {sorted.map((tx) => (
                <div
                  key={tx.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <div>
                    <p className="font-medium capitalize text-slate-100">
                      {tx.type} • {tx.status || "completed"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {tx.createdAt || tx.$createdAt}
                    </p>
                    {tx.meta && (
                      <p className="text-[11px] text-slate-500">{tx.meta}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "withdraw"
                          ? "text-rose-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {tx.type === "withdraw" ? "-" : "+"}$
                      {Number(tx.amount || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {tx.currency || "USD"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

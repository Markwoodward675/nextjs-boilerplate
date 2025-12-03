// app/transactions/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserTransactions } from "../../lib/api";

export default function TransactionsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/transactions");
        return;
      }
      setUser(u);
      setChecking(false);

      try {
        const tx = await getUserTransactions(u.$id);
        if (!mounted) return;
        setTransactions(tx);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-3">
      <Card>
        <h1 className="text-xs font-semibold text-slate-100">
          Transactions
        </h1>
        <p className="mt-1 text-[11px] text-slate-400">
          Ledger of deposits, withdrawals, investments, and affiliate
          commissions tied to your Day Trader account.
        </p>
        {error && (
          <p className="mt-2 text-[10px] text-red-400">
            Unable to load transactions: {error}
          </p>
        )}
      </Card>

      <Card>
        <div className="overflow-x-auto text-[11px]">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-[10px] uppercase tracking-wide">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-4 text-slate-500 text-center"
                  >
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr
                  key={tx.$id}
                  className="border-b border-slate-900/80 last:border-b-0"
                >
                  <td className="py-2 pr-4 text-slate-300">
                    {new Date(tx.$createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-300 capitalize">
                    {tx.type?.toLowerCase()}
                  </td>
                  <td className="py-2 pr-4 text-slate-300">
                    {tx.amount?.toFixed
                      ? tx.amount.toFixed(2)
                      : tx.amount}{" "}
                    {tx.currency || "USD"}
                  </td>
                  <td className="py-2 text-slate-300">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                        tx.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                          : tx.status === "failed"
                          ? "bg-red-500/10 text-red-300 border border-red-500/40"
                          : "bg-slate-700/40 text-slate-200 border border-slate-600/60"
                      }`}
                    >
                      {tx.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}

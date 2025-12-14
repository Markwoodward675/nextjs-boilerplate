"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserTransactions } from "../../lib/api";

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancelled) return;

        setUser(u);

        const t = await getUserTransactions(u.$id);
        if (!cancelled) setTxs(t || []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load transactions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const sorted = useMemo(() => {
    return [...(txs || [])].sort(
      (a, b) =>
        new Date(b.createdAt || b.$createdAt).getTime() -
        new Date(a.createdAt || a.$createdAt).getTime()
    );
  }, [txs]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading transactions…</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-slate-400">
            Activity log for deposits, withdrawals, trades, investments, and bonuses.
          </p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((t) => (
                <div
                  key={t.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.title || t.meta || t.category || "Transaction"}</div>
                    <div className="text-xs text-slate-500">
                      {t.category || t.type || "general"} • {t.createdAt || t.$createdAt}
                    </div>
                  </div>
                  <div className="font-semibold text-emerald-300">{money(t.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserWallets, getUserTransactions } from "../../lib/api";

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TradePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
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

        const [ws, t] = await Promise.all([
          getUserWallets(u.$id),
          getUserTransactions(u.$id),
        ]);

        if (!cancelled) {
          setWallets(ws || []);
          setTxs(t || []);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load trading data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const tradingWallet = useMemo(
    () => (wallets || []).find((w) => w.currencyType === "trading") || null,
    [wallets]
  );

  const recentTradeLike = useMemo(() => {
    return (txs || [])
      .filter((t) => t.category === "trade" || t.type === "trade")
      .slice(0, 10);
  }, [txs]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading trade…</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Trading simulations</h1>
          <p className="text-sm text-slate-400">
            Paper trade flow. This page shows your trading wallet + recent trade activity.
          </p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-sm font-semibold">Trading wallet</div>
          <div className="mt-2 text-3xl font-semibold">{money(tradingWallet?.balance)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Status: {tradingWallet ? (tradingWallet.isActive ? "active" : "inactive") : "not created"}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold mb-2">Recent trade activity</h2>
          {recentTradeLike.length === 0 ? (
            <p className="text-sm text-slate-400">No trade activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTradeLike.map((t) => (
                <div
                  key={t.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.title || t.meta || "Trade"}</div>
                    <div className="text-xs text-slate-500">{t.createdAt || t.$createdAt}</div>
                  </div>
                  <div className="font-semibold text-emerald-300">{money(t.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold">Next step</h2>
          <p className="mt-2 text-sm text-slate-400">
            If you want, I can add a “Simulate Buy/Sell” form that writes a transaction into your
            <code className="mx-1 text-slate-200">transactions</code> table to populate this page.
          </p>
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

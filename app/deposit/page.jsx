"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserWallets, getUserTransactions } from "../../lib/api";

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function DepositPage() {
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
        if (!cancelled) setErr(e?.message || "Failed to load deposit page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const mainWallet = useMemo(
    () => (wallets || []).find((w) => w.currencyType === "main") || null,
    [wallets]
  );

  const recentDeposits = useMemo(() => {
    return (txs || [])
      .filter((t) => t.category === "deposit" || t.type === "deposit")
      .slice(0, 10);
  }, [txs]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading deposit…</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Deposit</h1>
          <p className="text-sm text-slate-400">
            Add simulated funds to your main wallet. (Payment provider wiring can be added next.)
          </p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-sm font-semibold">Main wallet</div>
            <div className="mt-2 text-3xl font-semibold">{money(mainWallet?.balance)}</div>
            <div className="mt-1 text-xs text-slate-500">currencyType: main</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-sm font-semibold">Deposit method</div>
            <p className="mt-2 text-sm text-slate-400">
              This is currently a placeholder UI (so the page isn’t blank).
              If you want NOWPayments / card simulation, I can add it next.
            </p>
            <button
              type="button"
              className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
              onClick={() => alert("Next step: implement simulated deposit write → transactions + wallet update.")}
            >
              Simulate deposit (coming next)
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold mb-2">Recent deposits</h2>
          {recentDeposits.length === 0 ? (
            <p className="text-sm text-slate-400">No deposits yet.</p>
          ) : (
            <div className="space-y-2">
              {recentDeposits.map((t) => (
                <div
                  key={t.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.title || "Deposit"}</div>
                    <div className="text-xs text-slate-500">{t.createdAt || t.$createdAt}</div>
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

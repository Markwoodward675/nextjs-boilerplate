"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
} from "../../lib/api";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";

export default function InvestPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const u = await getCurrentUser();
        if (!u) {
          router.replace("/signin");
          return;
        }
        if (cancelled) return;
        setUser(u);

        const [wallets, txs] = await Promise.all([
          getUserWallets(u.$id),
          getUserTransactions(u.$id),
        ]);

        if (cancelled) return;

        // wallet schema uses currencyType, NOT type
        setWallet((wallets || []).find((w) => w.currencyType === "main") || null);

        // filter investment-related transactions (safe)
        setInvestments((txs || []).filter((t) => t.category === "invest"));
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Failed to load investments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading investments…</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Investment simulations</h1>
          <p className="text-sm text-slate-400">
            Allocate funds from your main wallet into educational investment plans.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium mb-1">Available capital</h2>
          {wallet ? (
            <>
              <p className="text-2xl font-semibold">
                ${Number(wallet.balance || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                Main wallet balance for simulations
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Main wallet not created yet.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium mb-2">Investment history</h2>

          {investments.length === 0 ? (
            <p className="text-sm text-slate-400">
              No investment simulations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {investments.map((inv) => (
                <div
                  key={inv.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {inv.meta || "Investment"} • {inv.status || "active"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {inv.createdAt || inv.$createdAt}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-300">
                    ${Number(inv.amount || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

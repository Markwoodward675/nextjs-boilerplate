// app/trade/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ... } from "../../lib/api";
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

export default function TradePage() {
  const { user, checking } = useProtectedUser();
  const [tradingWallet, setTradingWallet] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [wallets, txs] = await Promise.all([
          getUserWallets(user.$id),
          getUserTransactions(user.$id, "trade"),
        ]);
        if (cancelled) return;

        setTradingWallet((wallets || []).find((w) => w.type === "trading") || null);
        setTrades(txs || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load trading data. Please try again shortly."
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
        <div className="text-sm text-slate-300">Loading trading workspace…</div>
      </main>
    );
  }

  if (!user) return null;

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Trading workspace
          </h1>
          <p className="text-sm text-slate-400">
            Use your trading wallet to simulate day trades and track your
            performance.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-xs uppercase text-slate-400">Trading wallet</p>
          {tradingWallet ? (
            <>
              <p className="mt-1 text-2xl font-semibold">
                $
                {Number(tradingWallet.balance || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Returns balance: $
                {Number(
                  tradingWallet.investmentReturnsBalance || 0
                ).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Remember: this is an educational environment — no real orders
                are sent to any broker.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              No trading wallet found yet. It will be created automatically when
              your profile is bootstrapped.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Trade history
          </h2>
          {trades.length === 0 ? (
            <p className="text-sm text-slate-400">
              You haven&apos;t logged any trades yet. Once you place your first
              simulated trade, it will appear here.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {trades.map((t) => (
                <div
                  key={t.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-slate-100">
                      {t.symbol || t.meta || "Trade"} •{" "}
                      {t.status || "completed"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t.createdAt || t.$createdAt}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      (t.profit || 0) >= 0
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }`}
                  >
                    P&L: $
                    {Number(t.profit || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

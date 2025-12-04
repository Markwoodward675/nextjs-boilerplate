// app/dashboard/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getUserAlerts,
  getAffiliateAccount,
  getAffiliateOverview,
} from "../../lib/api";
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

export default function DashboardPage() {
  const { user, checking } = useProtectedUser();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [affiliateAccount, setAffiliateAccount] = useState(null);
  const [affiliateOverview, setAffiliateOverview] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [ws, txs, als, affAcc, affOv] = await Promise.all([
          getUserWallets(user.$id),
          getUserTransactions(user.$id),
          getUserAlerts(user.$id),
          getAffiliateAccount(user.$id),
          getAffiliateOverview(user.$id),
        ]);

        if (cancelled) return;
        setWallets(ws || []);
        setTransactions(txs || []);
        setAlerts(als || []);
        setAffiliateAccount(affAcc || null);
        setAffiliateOverview(affOv || null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load dashboard data. Please try again shortly."
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
        <div className="text-sm text-slate-300">Loading your dashboard…</div>
      </main>
    );
  }

  if (!user) {
    // redirect already triggered
    return null;
  }

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  const mainWallet = wallets.find((w) => w.type === "main");
  const tradingWallet = wallets.find((w) => w.type === "trading");
  const affiliateWallet = wallets.find((w) => w.type === "affiliate");

  const totalBalance = [mainWallet, tradingWallet, affiliateWallet]
    .filter(Boolean)
    .reduce((sum, w) => sum + (w.balance || 0), 0);

  const totalReturns = wallets.reduce(
    (sum, w) => sum + (w.investmentReturnsBalance || 0),
    0
  );

  const recentTransactions = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.$createdAt) -
        new Date(a.createdAt || a.$createdAt)
    )
    .slice(0, 5);

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {user.name || "Trader"}
            </h1>
            <p className="text-sm text-slate-400">
              Track your balances, trading activity, and affiliate earnings in
              one clean overview.
            </p>
          </div>
          <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs text-emerald-300">
            Email verified • Live dashboard access
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Top cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Total portfolio
            </p>
            <p className="mt-2 text-2xl font-semibold">
              ${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Combined main, trading, and affiliate balances.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Realized returns
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-400">
              ${totalReturns.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Investment returns balance across all wallets.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Active alerts
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {alerts.filter((a) => a.status !== "dismissed").length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Includes your $100 signup bonus and other platform notices.
            </p>
          </div>
        </section>

        {/* Wallet card-style block */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
            <h2 className="text-sm font-medium text-slate-200 mb-2">
              Wallet overview (card style)
            </h2>
            <div className="space-y-3">
              {[
                { label: "Main wallet", wallet: mainWallet },
                { label: "Trading wallet", wallet: tradingWallet },
                { label: "Affiliate wallet", wallet: affiliateWallet },
              ].map(({ label, wallet }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2"
                >
                  <div>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold">
                      $
                      {(wallet?.balance || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    Returns: $
                    {(wallet?.investmentReturnsBalance || 0).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 2 }
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-medium text-slate-200 mb-1">
              Market snapshot
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Multi-bar chart area – plug in your chart component here to show
              live prices with hover tooltips.
            </p>
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-xs text-slate-500">
              Your bar chart / price widget goes here.
            </div>
          </div>
        </section>

        {/* Recent transactions & affiliate */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-medium text-slate-200 mb-2">
              Recent activity
            </h2>
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-500">
                No transactions yet. Make your first deposit or trade to see
                activity here.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {recentTransactions.map((tx) => (
                  <li
                    key={tx.$id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium capitalize text-slate-100">
                        {tx.type} • {tx.status || "completed"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {tx.createdAt || tx.$createdAt}
                      </p>
                    </div>
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-medium text-slate-200 mb-2">
              Affiliate overview
            </h2>
            {!affiliateAccount ? (
              <p className="text-xs text-slate-500">
                You don&apos;t have an affiliate profile yet. Once you activate
                it, your referrals and commissions will be tracked here.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="text-slate-300">
                  Referral code:{" "}
                  <span className="font-mono text-emerald-300">
                    {affiliateAccount.code || affiliateAccount.slug}
                  </span>
                </p>
                <p className="text-slate-400">
                  Total referrals:{" "}
                  <span className="font-semibold">
                    {affiliateOverview?.referrals?.length || 0}
                  </span>
                </p>
                <p className="text-slate-400">
                  Total commissions:{" "}
                  <span className="font-semibold">
                    $
                    {(
                      affiliateOverview?.commissions || []
                    ).reduce((sum, c) => sum + (c.amount || 0), 0)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

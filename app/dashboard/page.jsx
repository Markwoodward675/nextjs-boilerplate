"use client";

import Card from "../../components/Card";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../lib/api";

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  return (
    <main className="space-y-4 pb-10">
      {/* Account summary */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Account
            </p>
            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              {user?.name || "Trader"}
            </h1>
            <p className="text-xs text-slate-400">
              {user?.email || "Signed in with Appwrite"} · USER
            </p>
            {user && (
              <p className="mt-1 text-[10px] text-slate-500 font-mono">
                ID: {user.$id}
              </p>
            )}
          </div>
          <div className="text-xs text-slate-400 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Workflow
            </p>
            <p>
              Fund wallets, allocate into strategies, track open risk, and
              withdraw or reinvest gains.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/deposit"
                className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-emerald-400"
              >
                + Fund wallet
              </a>
              <a
                href="/trade"
                className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-900"
              >
                Open trading layout
              </a>
              <a
                href="/affiliate"
                className="inline-flex items-center rounded-full border border-blue-600/70 px-3 py-1.5 text-[11px] text-blue-200 hover:bg-blue-900/20"
              >
                Affiliate center
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Portfolio / risk / execution */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Portfolio overview
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Map your capital across brokers, exchanges, and stablecoins. Track
            per-asset, per-strategy, and per-account exposure.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Risk & alerts
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Configure alerts, hard loss limits, and position sizing rules so
            one trade never defines your month.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Execution & journal
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Day Trader focuses on structure and discipline. Execution and
            custody stay with your own regulated venues.
          </p>
        </Card>
      </section>

      {/* Wallets + affiliate */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">Wallets</h2>
          <p className="mt-1 text-xs text-slate-400">
            Main, trading, and affiliate wallets are tracked here with
            card-style balances. Use Deposits and Withdrawals to control
            cashflow.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            As you connect and fund accounts, this section will reflect real
            balances, currencies, and limits per wallet.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Affiliate overview
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Create an affiliate account in Settings and share your registration
            links. Referred traders and their deposit volume can generate
            recurring commission.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Detailed referral and commission data is available in the Affiliate
            and Transactions sections.
          </p>
        </Card>
      </section>

      {/* Markets / pattern cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            BTC structure
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">
            Trend, pullbacks, rotations
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            Focus on clean structures instead of noise: clear expansions,
            measured pullbacks, and well-defined invalidation.
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            ETH rotations
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">
            Technology exposure
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            Treat ETH and infrastructure names as part of your technology risk
            bucket instead of random coins.
          </p>
        </Card>
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Stablecoin flows
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-100">
            Cash & dry powder
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            Stablecoins, idle cash, and unallocated capital are tracked so you
            always know how much risk you can deploy.
          </p>
        </Card>
      </section>
    </main>
  );
}

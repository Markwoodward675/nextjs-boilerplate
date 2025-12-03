// app/dashboard/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import SignOutButton from "../../components/SignOutButton";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getAffiliateOverview,
  getUserAlerts,
} from "../../lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [walletError, setWalletError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState("");
  const [affiliate, setAffiliate] = useState(null);
  const [affiliateError, setAffiliateError] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/dashboard");
        return;
      }
      setUser(u);
      setChecking(false);

      try {
        const w = await getUserWallets(u.$id);
        if (!mounted) return;
        setWallets(w);
      } catch (err) {
        console.error(err);
        setWalletError(String(err.message || err));
      }

      try {
        const tx = await getUserTransactions(u.$id);
        if (!mounted) return;
        setTransactions(tx);
      } catch (err) {
        console.error(err);
        setTransactionsError(String(err.message || err));
      }

      try {
        const aff = await getAffiliateOverview(u.$id);
        if (!mounted) return;
        setAffiliate(aff);
      } catch (err) {
        console.error(err);
        setAffiliateError(String(err.message || err));
      }

      try {
        const al = await getUserAlerts(u.$id);
        if (!mounted) return;
        setAlerts(al);
      } catch (err) {
        console.error(err);
        setAlertsError(String(err.message || err));
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

  const mainWallet = wallets.find((w) => w.type === "main");
  const tradingWallet = wallets.find((w) => w.type === "trading");
  const affiliateWallet = wallets.find((w) => w.type === "affiliate");
  const totalBalance =
    (mainWallet?.balance || 0) +
    (tradingWallet?.balance || 0) +
    (affiliateWallet?.balance || 0);

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      {/* Top account header */}
      <section className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Account
          </div>
          <div className="text-sm font-semibold text-slate-100">
            {user.name || "Trader"}
          </div>
          <div className="text-[11px] text-slate-500">
            {user.email} · USER
          </div>
        </div>
        <SignOutButton variant="button" />
      </section>

      {/* Total balance */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">
                TOTAL BALANCE
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-50">
                {totalBalance.toFixed(2)} USD
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Sum of main, trading, and affiliate wallets.
              </p>
              {walletError && (
                <p className="mt-1 text-[10px] text-red-400">
                  Unable to load dashboard balances: {walletError}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400">Portfolio overview</div>
          <p className="mt-1 text-xs text-slate-300">
            Connect balances and positions from brokers, exchanges, and
            wallets to see total exposure in one place.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Execution lives with your own broker or exchange. Day Trader
            focuses on tools, tracking, and discipline.
          </p>
        </Card>
      </section>

      {/* Wallets summary */}
      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <div className="text-[11px] text-slate-400">MAIN WALLET</div>
          <div className="mt-1 text-lg font-semibold text-slate-50">
            {(mainWallet?.balance || 0).toFixed(2)} USD
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Funding and capital allocation.
          </p>
        </Card>
        <Card>
          <div className="text-[11px] text-slate-400">TRADING WALLET</div>
          <div className="mt-1 text-lg font-semibold text-slate-50">
            {(tradingWallet?.balance || 0).toFixed(2)} USD
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Active risk capital for live strategies.
          </p>
        </Card>
        <Card>
          <div className="text-[11px] text-slate-400">
            AFFILIATE WALLET
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-50">
            {(affiliateWallet?.balance || 0).toFixed(2)} USD
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Earnings from referred traders and funded volume.
          </p>
        </Card>
      </section>

      {/* Transactions & affiliate / alerts preview */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Recent activity
            </div>
            <button
              onClick={() => router.push("/transactions")}
              className="text-[11px] text-blue-400 hover:text-blue-300"
            >
              View all
            </button>
          </div>
          {transactionsError && (
            <p className="mt-1 text-[10px] text-red-400">
              Unable to load transactions: {transactionsError}
            </p>
          )}
          <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
            {transactions.length === 0 && !transactionsError && (
              <li className="text-slate-500">
                No transactions recorded yet.
              </li>
            )}
            {transactions.slice(0, 5).map((tx) => (
              <li
                key={tx.$id}
                className="flex items-center justify-between border-b border-slate-800/60 pb-1 last:border-b-0 last:pb-0"
              >
                <span className="capitalize">
                  {tx.type?.toLowerCase()} ·{" "}
                  <span className="text-slate-500 text-[10px]">
                    {new Date(tx.$createdAt).toLocaleString()}
                  </span>
                </span>
                <span className="font-medium">
                  {tx.amount?.toFixed
                    ? tx.amount.toFixed(2)
                    : tx.amount}{" "}
                  {tx.currency || "USD"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Affiliate overview
            </div>
            <button
              onClick={() => router.push("/affiliate")}
              className="text-[11px] text-blue-400 hover:text-blue-300"
            >
              Affiliate center
            </button>
          </div>
          {affiliateError && (
            <p className="mt-1 text-[10px] text-red-400">
              Unable to load affiliate data: {affiliateError}
            </p>
          )}
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-xl bg-slate-900/80 border border-slate-700/80 px-2 py-2">
              <div className="text-[10px] text-slate-500">
                Referrals
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {affiliate?.referrals?.length || 0}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-700/80 px-2 py-2">
              <div className="text-[10px] text-slate-500">Payouts</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {affiliate?.commissions?.filter(
                  (c) => c.status === "paid"
                ).length || 0}
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/80 border border-slate-700/80 px-2 py-2">
              <div className="text-[10px] text-slate-500">Alerts</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {alerts.length}
              </div>
            </div>
          </div>
          {alertsError && (
            <p className="mt-2 text-[10px] text-red-400">
              Unable to load alerts: {alertsError}
            </p>
          )}
        </Card>
      </section>
    </main>
  );
}

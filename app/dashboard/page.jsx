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

const MARKET = [
  { symbol: "BTCUSDT", label: "BTC / USDT", price: 91000, change: 2.1 },
  { symbol: "ETHUSDT", label: "ETH / USDT", price: 3000, change: 1.4 },
  { symbol: "SOLUSDT", label: "SOL / USDT", price: 210, change: 3.9 },
  { symbol: "XRPUSDT", label: "XRP / USDT", price: 1.12, change: -0.8 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [unverified, setUnverified] = useState(false);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [walletError, setWalletError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [transactionsError, setTransactionsError] = useState("");
  const [affiliate, setAffiliate] = useState(null);
  const [affiliateError, setAffiliateError] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState("");
  const [hoverSymbol, setHoverSymbol] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;

      if (!u) {
        router.replace("/auth/login?next=/dashboard");
        return;
      }

      if (!u.emailVerification) {
        setUser(u);
        setUnverified(true);
        setChecking(false);
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

  if (unverified) {
    return (
      <main className="px-4 pt-6 pb-24 space-y-4">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Verify your email to continue
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium">{user.email}</span>. Once your email
            is verified, you&apos;ll be able to access dashboards, wallets,
            trading tools, and affiliate center.
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            If you don&apos;t see the email, check your spam folder or resend
            from your Appwrite console flow. After clicking the link, sign in
            again.
          </p>
        </Card>
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

  const investmentReturns = mainWallet?.investmentReturnsBalance || 0;

  const referralsCount = affiliate?.referrals?.length || 0;
  const totalAffiliateEarned = (affiliate?.commissions || []).reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      {/* Top header */}
      <section className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Overview
          </div>
          <div className="text-sm font-semibold text-slate-100">
            {user.name || "Trader"}
          </div>
          <div className="text-[11px] text-slate-500">
            Signed in · {user.email}
          </div>
        </div>
        <SignOutButton variant="button" />
      </section>

      {/* Single debit/credit-style balance card */}
      <section>
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 px-4 py-4 shadow-xl overflow-hidden">
          {/* card chrome */}
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full border border-emerald-500/40 opacity-30" />
          <div className="absolute right-0 top-6 h-20 w-20 rounded-full border border-blue-500/40 opacity-30" />
          <div className="absolute -right-8 bottom-0 h-24 w-24 bg-slate-900/60 blur-2xl" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-[0.14em]">
                Day Trader · Multi-wallet
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-50">
                {totalBalance.toFixed(2)} USD
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Main · Trading · Affiliate · Investment returns
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">
                Returns (admin-controlled)
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {investmentReturns.toFixed(2)} USD
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Allocated from investments as they are realized.
              </div>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">MAIN</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {(mainWallet?.balance || 0).toFixed(2)} USD
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Deposits & payouts live here.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">TRADING</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {(tradingWallet?.balance || 0).toFixed(2)} USD
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Risk capital for strategies.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">AFFILIATE</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {(affiliateWallet?.balance || 0).toFixed(2)} USD
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Earnings from referred volume.
              </p>
            </div>
          </div>
        </div>
        {walletError && (
          <p className="mt-2 text-[10px] text-red-400">
            Unable to load dashboard balances: {walletError}
          </p>
        )}
      </section>

      {/* Market snapshot with multi-bar chart */}
      <section className="grid gap-3 md:grid-cols-[3fr,2fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Market snapshot
            </div>
            <div className="text-[10px] text-slate-500">
              Hover bars to see current price.
            </div>
          </div>

          <div className="mt-3 h-40 rounded-2xl bg-slate-950 border border-slate-800/80 px-3 py-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent)]" />
            <div className="relative flex items-end gap-3 h-full">
              {MARKET.map((m) => {
                const height =
                  18 + (Math.log10(m.price + 10) - 2) * 22; // just to vary bar heights
                const positive = m.change >= 0;
                return (
                  <div
                    key={m.symbol}
                    className="flex-1 flex flex-col items-center justify-end gap-1 cursor-pointer"
                    onMouseEnter={() => setHoverSymbol(m.symbol)}
                    onMouseLeave={() => setHoverSymbol(null)}
                  >
                    <div
                      className={`w-4 rounded-full ${
                        positive ? "bg-emerald-400/80" : "bg-red-400/80"
                      } transition-all`}
                      style={{ height: `${Math.max(10, height)}px` }}
                    />
                    <div className="text-[9px] text-slate-400">
                      {m.symbol.replace("USDT", "")}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute inset-x-4 bottom-6 h-px bg-slate-800/80" />
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            {MARKET.map((m) => {
              const active = hoverSymbol === m.symbol;
              return (
                <div
                  key={m.symbol}
                  className={`rounded-full border px-2 py-1 ${
                    active
                      ? "border-emerald-400/80 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-300"
                  }`}
                >
                  {m.label} ·{" "}
                  <span className="font-semibold">
                    ${m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>{" "}
                  <span
                    className={
                      m.change >= 0 ? "text-emerald-300" : "text-red-300"
                    }
                  >
                    {m.change >= 0 ? "+" : ""}
                    {m.change}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400">
            Discipline over drama
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            Day Trader is built for traders who treat the game like a business:
            capital in, measured risk, controlled payouts, and documented
            decisions. The goal is{" "}
            <span className="font-semibold">consistency</span>, not lottery
            tickets.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Your job: follow the plan. The platform&apos;s job: keep your
            wallets, investments, alerts, and affiliate flows organized so you
            always know exactly where your money is.
          </p>
        </Card>
      </section>

      {/* Activity + affiliate snapshot */}
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
            <p className="mt-2 text-[10px] text-red-400">
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
                className="flex items-center justify-between border-b border-slate-900/70 pb-1 last:border-b-0 last:pb-0"
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
              Affiliate momentum
            </div>
            <button
              onClick={() => router.push("/affiliate")}
              className="text-[11px] text-blue-400 hover:text-blue-300"
            >
              Affiliate center
            </button>
          </div>
          {affiliateError && (
            <p className="mt-2 text-[10px] text-red-400">
              Unable to load affiliate data: {affiliateError}
            </p>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">Referrals</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {referralsCount}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">Commissions</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {totalAffiliateEarned.toFixed(2)} USD
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
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

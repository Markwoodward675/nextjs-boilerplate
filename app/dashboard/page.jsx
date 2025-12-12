// app/dashboard/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getAffiliateAccount,
  getAffiliateOverview,
  getUserAlerts,
  getUserProfile,            // 👈 NEW
} from "../../lib/api";


// Small helper for error messages
function getErrorMessage(err, fallback) {
  if (!err) return fallback;
  const anyErr = /** @type {any} */ (err);
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;
  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}

// Protect route: redirect to /signin if not logged in
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

// Email verification gate (before showing full data)
function EmailVerificationBanner({ user }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const email = user?.email || "";

  const handleResend = async () => {
    setSending(true);
    setMessage("");
    setError("");

    try {
      await resendVerificationEmail();
      setMessage(
        "Verification email sent. Please check your inbox (and spam folder)."
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not send verification email. Please try again in a moment."
        )
      );
    } finally {
      setSending(false);
    }
  };

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="font-medium">Verify your email to unlock everything</p>
          <p className="text-xs text-amber-100/90">
            We&apos;ve sent a verification link to{" "}
            <span className="font-semibold">{email}</span>. You&apos;ll need to
            verify before accessing all Day Trader features.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={sending}
            onClick={handleResend}
            className="rounded-xl border border-amber-400/70 bg-amber-500/20 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/30 disabled:opacity-60"
          >
            {sending ? "Resending…" : "Resend email"}
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="rounded-xl border border-amber-400/40 bg-transparent px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10"
          >
            I&apos;ve verified
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-2 text-[11px] text-emerald-100/90">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-rose-100/90">{error}</p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, checking } = useProtectedUser();
  const [codeVerified, setCodeVerified] = useState(null);


  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [affiliate, setAffiliate] = useState(null);
  const [affiliateOverview, setAffiliateOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
  if (!user) return;
  let cancelled = false;

  async function checkCode() {
    try {
      const profile = await getUserProfile(user.$id);
      if (cancelled) return;

      if (profile?.verificationCodeVerified) {
        setCodeVerified(true);
      } else {
        // Not verified by code → send them to verify-code gate
        setCodeVerified(false);
        router.replace("/verify-code");
      }
    } catch (err) {
      if (!cancelled) {
        console.error("Code verification check failed:", err);
      }
    }
  }

  checkCode();
  return () => {
    cancelled = true;
  };
}, [user, router]);
useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [ws, txs, aff, affOv, als] = await Promise.all([
          getUserWallets(user.$id),
          getUserTransactions(user.$id),
          getAffiliateAccount(user.$id),
          getAffiliateOverview(user.$id),
          getUserAlerts(user.$id),
        ]);
        if (cancelled) return;

        setWallets(ws || []);
        setTransactions(txs || []);
        setAffiliate(aff);
        setAffiliateOverview(affOv);
        setAlerts(als || []);
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

  if (checking || loadingData || !user || codeVerified === null) {
  return (
    <main className="min-h-[100vh] flex items-center justify-center bg-slate-950">
      <div className="text-sm text-slate-300">Loading your dashboard…</div>
    </main>
  );
}

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;

  const mainWallet = wallets.find((w) => w.type === "main");
  const tradingWallet = wallets.find((w) => w.type === "trading");
  const affiliateWallet = wallets.find((w) => w.type === "affiliate");

  // 🧱 Simple top navigation for protected area
  const NavLink = ({ label, href }) => (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="text-xs text-slate-300 hover:text-emerald-300 transition"
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-[100vh] bg-slate-950 px-4 py-4 text-slate-50">
      <div className="mx-auto max-w-6xl space-y-4">
        {/* Top nav */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-sm font-semibold text-emerald-300">
              DT
            </div>
            <div>
              <p className="text-[11px] uppercase text-slate-500 tracking-wide">
                Day Trader
              </p>
              <h1 className="text-lg font-semibold text-slate-50">
                Overview dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Track your educational balances, activity, and affiliate
                insights in one place.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3 text-xs">
            <NavLink label="Dashboard" href="/dashboard" />
            <NavLink label="Wallets" href="/wallet" />
            <NavLink label="Trade" href="/trade" />
            <NavLink label="Invest" href="/invest" />
            <NavLink label="Deposit" href="/deposit" />
            <NavLink label="Withdraw" href="/withdraw" />
            <NavLink label="Transactions" href="/transactions" />
            <NavLink label="Affiliate" href="/affiliate" />
            <NavLink label="Giftcards: Buy" href="/giftcards/buy" />
            <NavLink label="Giftcards: Sell" href="/giftcards/sell" />
            <NavLink label="Alerts" href="/alerts" />
            <NavLink label="Settings" href="/settings" />
          </nav>
        </header>

        {/* Email verification gate */}
        {!emailVerified && <EmailVerificationBanner user={user} />}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Wallet cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs text-slate-400">Main wallet</p>
            <p className="mt-1 text-2xl font-semibold">
              $
              {Number(mainWallet?.balance || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Educational balance for overall portfolio simulations.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs text-slate-400">Trading wallet</p>
            <p className="mt-1 text-2xl font-semibold">
              $
              {Number(tradingWallet?.balance || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              For intraday and swing trade simulations.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-xs text-slate-400">Affiliate wallet</p>
            <p className="mt-1 text-2xl font-semibold">
              $
              {Number(affiliateWallet?.balance || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Tracks simulated payouts from referrals.
            </p>
          </div>
        </section>

        {/* Simple recent activity + alerts summary */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold mb-2">Recent activity</h2>
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-500">
                No activity yet. Once you start simulated deposits, trades, or
                investments, they&apos;ll appear here.
              </p>
            ) : (
              <ul className="space-y-1">
                {transactions.slice(0, 5).map((tx) => (
                  <li
                    key={tx.$id}
                    className="flex items-center justify-between text-xs text-slate-300"
                  >
                    <span className="capitalize">{tx.type}</span>
                    <span>
                      $
                      {Number(tx.amount || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold mb-2">Alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500">
                No alerts yet. Important updates and signup bonuses will show
                here.
              </p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-auto">
                {alerts.slice(0, 5).map((alert) => (
                  <li
                    key={alert.$id}
                    className="text-xs text-slate-200 border-b border-slate-800/70 pb-1 last:border-b-0"
                  >
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-[11px] text-slate-400">{alert.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

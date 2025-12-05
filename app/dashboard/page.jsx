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
} from "../../lib/api";
import { account } from "../../lib/appwrite";

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

function EmailVerificationBanner({ user }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const email = user?.email || "";

  const VERIFIED_REDIRECT_URL =
    "https://nextjs-boilerplate-psi-three-50.vercel.app/verify";

  async function createVerificationCompat() {
    const anyAccount = /** @type {any} */ (account);

    if (typeof anyAccount.createVerification === "function") {
      return anyAccount.createVerification({ url: VERIFIED_REDIRECT_URL });
    }

    if (typeof anyAccount.createEmailVerification === "function") {
      return anyAccount.createEmailVerification(VERIFIED_REDIRECT_URL);
    }

    throw new Error(
      "This Appwrite SDK version does not support email verification."
    );
  }

  const handleResend = async () => {
    setSending(true);
    setMessage("");
    setError("");

    try {
      await createVerificationCompat();
      setMessage(
        "Verification email sent. Please check your inbox (and spam folder)."
      );
    } catch (err) {
      console.error("resend verification error:", err);
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
    try {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      console.error("reload error:", err);
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
            className="rounded-xl border border-amber-400/70 bg-amber-500/20 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/30 transition disabled:opacity-60"
          >
            {sending ? "Sending…" : "Resend email"}
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="rounded-xl border border-amber-200/40 bg-transparent px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10 transition"
          >
            I&apos;ve verified
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-2 text-[11px] text-emerald-100">{message}</p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-rose-100">
          {typeof error === "string" ? error : String(error)}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user, checking } = useProtectedUser();
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

  if (checking || loadingData || !user) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading your dashboard…</div>
      </main>
    );
  }

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;

  const mainWallet = wallets.find((w) => w.type === "main");
  const tradingWallet = wallets.find((w) => w.type === "trading");
  const affiliateWallet = wallets.find((w) => w.type === "affiliate");

  return (
    <main className="min-h-[100vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Overview dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Track your educational balances, activity, and affiliate insights in
            one place.
          </p>
        </header>

        {!emailVerified && <EmailVerificationBanner user={user} />}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

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
              {Number(affiliateWallet?.balance || 0).toLocaleString(
                undefined,
                { maximumFractionDigits: 2 }
              )}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Tracks simulated payouts from referrals.
            </p>
          </div>
        </section>

        {/* Extend here with charts / recent activity if you want */}
      </div>
    </main>
  );
}

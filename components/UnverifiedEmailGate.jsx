"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  resendVerificationEmail,
  getErrorMessage,
} from "../lib/api";

/**
 * Usage pattern (inside protected pages):
 *
 *   <UnverifiedEmailGate user={user}>
 *     { ... your normal dashboard / page content ... }
 *   </UnverifiedEmailGate>
 *
 * If user.emailVerification is false, it will show the
 * "Verify your email" banner and block the children.
 */
export default function UnverifiedEmailGate({ user, children }) {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const isVerified =
    currentUser?.emailVerification ||
    currentUser?.prefs?.emailVerification ||
    false;

  async function handleResend() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await resendVerificationEmail();
      setInfo(
        `We’ve sent a fresh verification link to ${
          currentUser?.email || "your email address"
        }. Check your inbox and spam folder.`
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to resend verification email. Please try again in a moment."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const freshUser = await getCurrentUser();

      // If no session, politely send them back to sign-in
      if (!freshUser) {
        setError("Your session has expired. Please sign in again.");
        router.push("/signin");
        return;
      }

      // If verified now, update state and let children render
      if (
        freshUser.emailVerification ||
        freshUser?.prefs?.emailVerification
      ) {
        setCurrentUser(freshUser);
        return;
      }

      // Still not verified – give gentle guidance
      setInfo(
        `We couldn’t confirm verification yet. Check your email inbox for the link, or tap “Resend email” to get a new one.`
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Something went wrong while checking your verification status. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // If verified, just render the protected content
  if (isVerified) {
    return <>{children}</>;
  }

  // If there is no user at all, bounce to sign in
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm">
          <h1 className="text-lg font-semibold text-slate-50 mb-2">
            Session expired
          </h1>
          <p className="text-slate-300 mb-4">
            We couldn’t find your Day Trader session. Please sign in again to
            access your dashboards and wallets.
          </p>
          <button
            type="button"
            onClick={() => router.push("/signin")}
            className="w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/30 transition"
          >
            Go to sign in
          </button>
        </div>
      </main>
    );
  }

  // Otherwise, show the verification gate
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm">
        <div className="mb-4">
          <p className="text-[11px] uppercase text-slate-500 tracking-wide mb-1">
            Day Trader
          </p>
          <h1 className="text-lg font-semibold text-slate-50">
            Verify your email to unlock everything
          </h1>
          <p className="mt-2 text-slate-300 text-sm">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-emerald-300">
              {currentUser.email}
            </span>
            . You&apos;ll need to verify before accessing all Day Trader
            features.
          </p>
        </div>

        {info && (
          <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
            {info}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800 transition disabled:opacity-60"
          >
            {loading ? "Sending…" : "Resend verification email"}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-50 hover:bg-emerald-500/30 transition disabled:opacity-60"
          >
            {loading ? "Checking…" : "I&apos;ve verified"}
          </button>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          If you no longer have access to this email, contact support so we can
          help you update your account details.
        </p>
      </div>
    </main>
  );
}

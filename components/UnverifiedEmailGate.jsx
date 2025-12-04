// components/UnverifiedEmailGate.jsx
"use client";

import { useState } from "react";
import { account } from "@/lib/appwrite"; // adjust path if needed

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

async function createVerificationCompat() {
  const anyAccount = /** @type {any} */ (account);
  const url = `${window.location.origin}/verify`;

  if (typeof anyAccount.createVerification === "function") {
    try {
      // New SDK style: object
      return await anyAccount.createVerification({ url });
    } catch {
      // Old SDK style: plain string
      return await anyAccount.createVerification(url);
    }
  }

  throw new Error(
    "This Appwrite SDK version does not support email verification API."
  );
}

/**
 * Props:
 *  - email: string
 */
export default function UnverifiedEmailGate({ email }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  const handleRefresh = () => {
    // Simple: reload to re-check emailVerification via getCurrentUser
    window.location.reload();
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-slate-950/90 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
            <span className="text-amber-400 text-xl">!</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-50">
              Verify your email to continue
            </h1>
            <p className="text-sm text-slate-400">
              For security, your Day Trader dashboard and wallets stay locked
              until your email is verified.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl bg-slate-900 border border-slate-800 p-3">
          <p className="text-xs text-slate-400 mb-1">Signed in as</p>
          <p className="break-all text-sm font-medium text-slate-100">
            {email || "Unknown email"}
          </p>
        </div>

        <ul className="mb-4 space-y-1 text-sm text-slate-400 list-disc list-inside">
          <li>We&apos;ve sent a verification link to this email.</li>
          <li>Click the link in your inbox to complete verification.</li>
          <li>After verifying, come back and refresh this page.</li>
        </ul>

        {message && (
          <div className="mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 px-3 py-2 text-xs text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-lg bg-rose-500/10 border border-rose-500/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="flex-1 rounded-xl border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-50 hover:bg-amber-500/20 transition disabled:opacity-60"
          >
            {sending ? "Sending..." : "Resend verification email"}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 transition"
          >
            Refresh
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          If you no longer have access to this email, contact support so we can
          help you update your account details.
        </p>
      </div>
    </div>
  );
}

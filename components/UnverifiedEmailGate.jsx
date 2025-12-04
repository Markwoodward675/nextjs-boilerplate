// components/UnverifiedEmailGate.jsx
"use client";

import { useState } from "react";
import { account } from "../lib/appwrite";
import { getErrorMessage } from "../lib/api"; // if you don't have this export, tell me and I'll inline it

export default function UnverifiedEmailGate({ email }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // IMPORTANT — your real deployed domain:
  const VERIFIED_REDIRECT_URL =
    "https://nextjs-boilerplate-psi-three-50.vercel.app/verify";

  // Version-compatible wrapper
  async function createVerificationCompat() {
    const anyAccount = /** @type {any} */ (account);

    if (typeof anyAccount.createVerification === "function") {
      // New SDK format
      return anyAccount.createVerification({ url: VERIFIED_REDIRECT_URL });
    }

    if (typeof anyAccount.createEmailVerification === "function") {
      // Legacy SDK fallback
      return anyAccount.createEmailVerification(VERIFIED_REDIRECT_URL);
    }

    throw new Error("This Appwrite SDK version does not support email verification.");
  }

  async function handleResend() {
    setSending(true);
    setMessage("");
    setError("");

    try {
      await createVerificationCompat();

      setMessage(
        "Verification email has been sent. Please check your inbox (and spam folder)."
      );
    } catch (err) {
      console.error("Verification send error:", err);
      setError(
        getErrorMessage(
          err,
          "Unable to send verification email. Please try again later."
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-100 mb-3">
          Verify your email to continue
        </h1>

        <p className="text-sm text-slate-300 mb-1">
          For security, your Day Trader dashboard and wallets stay locked until
          your email is verified.
        </p>

        <div className="text-sm text-slate-400 mt-3 space-y-1">
          <p className="text-slate-300">
            Signed in as <span className="text-emerald-300">{email}</span>
          </p>
          <p>• We’ve sent a verification link to this email.</p>
          <p>• Click the link in your inbox to complete verification.</p>
          <p>• After verifying, come back and refresh this page.</p>
        </div>

        {message && (
          <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="w-full rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 font-medium hover:bg-emerald-500/20 transition disabled:opacity-50"
          >
            {sending ? "Sending…" : "Resend verification email"}
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 font-medium hover:bg-slate-700 transition"
          >
            Refresh
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

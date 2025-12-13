"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  ensureUserBootstrap,
  requestVerificationCode,
  confirmVerificationCode,
} from "../../lib/api";

function getErrorMessage(err, fallback) {
  if (!err) return fallback;
  const anyErr = err;
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;
  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}

export default function VerifyCodePage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  // DEV-only: if your api.js fallback returns devCode, we show it
  const [devCode, setDevCode] = useState("");

  const email = useMemo(() => user?.email || "", [user]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const u = await getCurrentUser();

        if (!u) {
          router.replace("/signin");
          return;
        }

        // Ensure profile/wallets/bonus exist before code flows
        try {
          await ensureUserBootstrap(u);
        } catch (e) {
          // Keep the user signed in, but show a helpful message
          const msg = getErrorMessage(e, "Bootstrap failed.");
          if (!cancelled) {
            setError(
              msg +
                "\n\nIf this says NOT AUTHORIZED: Appwrite Console → DB → Collections (user_profile, wallets, alerts) → Permissions: Create/Read/Update/Delete = Users.\n" +
                'If this says Missing required attribute like "username": add it in code or make it optional in Appwrite.'
            );
          }
        }

        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSendCode() {
    if (!user) return;

    setSending(true);
    setError("");
    setInfo("");
    setDevCode("");

    try {
      // Extra safety: ensures profile exists (handles refresh)
      await ensureUserBootstrap(user);

      const res = await requestVerificationCode();

      setInfo(
        "A 6-digit verification code has been generated. In production, you would receive this by email or SMS."
      );

      // ✅ api.js returns devCode in DEV fallback
      if (res?.devCode) setDevCode(String(res.devCode));
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Could not generate a verification code. Please try again."
        )
      );
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!user) return;

    setVerifying(true);
    setError("");
    setInfo("");

    try {
      await ensureUserBootstrap(user);
      await confirmVerificationCode(code.trim());

      setInfo("Code verified successfully. Redirecting to your dashboard…");
      setTimeout(() => router.replace("/dashboard"), 800);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "The code you entered could not be verified. Please try again."
        )
      );
    } finally {
      setVerifying(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
          Checking your session…
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-sm font-semibold text-emerald-300">
            DT
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500 tracking-wide">
              Day Trader
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              Verify your account
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-2">
          We need to verify your Day Trader account with a 6-digit code before
          you can access your dashboard.
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Signed in as{" "}
          <span className="font-medium text-emerald-300">{email}</span>.
        </p>

        {info && (
          <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {info}
            {devCode && (
              <div className="mt-1 text-[11px] text-emerald-100">
                <strong>DEV ONLY CODE:</strong> {devCode}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-3 whitespace-pre-line rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending}
          className="w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 mb-4 text-sm font-medium text-emerald-50 hover:bg-emerald-500/30 transition disabled:opacity-60"
        >
          {sending ? "Generating code…" : "Send / regenerate 6-digit code"}
        </button>

        <form onSubmit={handleVerify} className="space-y-3">
          <div className="space-y-1 text-sm">
            <label className="block text-slate-300" htmlFor="code">
              Enter 6-digit code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              required
              className="w-full tracking-[0.4em] text-center text-lg rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder="••••••"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
              }}
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/30 transition disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify code"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Enter the code we generated for your account. In production, you would
          receive this by email or SMS.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureUserBootstrap,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  signOut,
  getErrorMessage,
} from "../../lib/api";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";
const ICON_SRC = "/icon.png";

export default function VerifyCodePage() {
  const router = useRouter();

  const [boot, setBoot] = useState(null);
  const [busy, setBusy] = useState(true);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canVerify = useMemo(() => /^\d{6}$/.test(code), [code]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setBusy(true);
      setErr("");
      setMsg("");

      try {
        const b = await ensureUserBootstrap();
        if (cancelled) return;

        if (!b?.user) {
          router.replace("/signin");
          return;
        }

        if (b?.profile?.verificationCodeVerified) {
          router.replace("/dashboard");
          return;
        }

        setBoot(b);
      } catch (e) {
        setErr(getErrorMessage(e, "We couldn’t confirm your session. Please sign in again."));
        router.replace("/signin");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const sendCode = async () => {
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await createOrRefreshVerifyCode(boot.user.$id);
      setMsg("Verification code sent. Check your email inbox (and Spam/Junk).");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to send verification code."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await verifySixDigitCode(boot.user.$id, code);
      router.replace("/dashboard");
    } catch (e) {
      setErr(getErrorMessage(e, "Invalid or expired code."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center px-4"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      <div className="w-full max-w-md bg-black/80 border border-yellow-500/80 rounded-2xl p-6 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <img
            src={ICON_SRC}
            alt="Day Trader"
            className="h-10 w-10 rounded-xl border border-yellow-500/50 bg-black/60 p-1"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="text-center">
            <div className="text-2xl font-extrabold text-yellow-400 leading-tight">
              Day Trader
            </div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-yellow-200/80">
              Markets • Wallets • Execution
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-gray-200 font-semibold">Secure verification required</p>
          <p className="text-gray-300 text-sm mt-1">
            Enter the 6-digit code sent to your email to unlock the dashboard.
          </p>
          {boot?.user?.email ? (
            <p className="text-gray-400 text-xs mt-2">
              Signed in as <span className="text-yellow-200 font-semibold">{boot.user.email}</span>
            </p>
          ) : null}
        </div>

        {err ? (
          <div className="mt-4 bg-red-600/20 border border-red-500/70 text-red-100 p-3 rounded-lg text-sm">
            {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mt-4 bg-emerald-600/15 border border-emerald-500/50 text-emerald-100 p-3 rounded-lg text-sm">
            {msg}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <button
            className="w-full p-3 rounded-lg bg-yellow-500 text-black font-extrabold hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={sendCode}
            disabled={busy || !boot?.user?.$id}
            type="button"
          >
            {busy ? "Working…" : "Send verification code to my email"}
          </button>

          <div>
            <label className="block text-sm text-gray-200 mb-1">6-digit code</label>
            <input
              className="w-full p-3 rounded-lg bg-black/50 text-white border border-yellow-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center font-extrabold"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              style={{ letterSpacing: "0.35em" }}
            />
            <p className="text-xs text-gray-400 mt-2">
              The code is sent to your registered email address.
            </p>
          </div>

          <button
            className="w-full p-3 rounded-lg bg-yellow-500 text-black font-extrabold hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={verify}
            disabled={!canVerify || busy || !boot?.user?.$id}
            type="button"
          >
            {busy ? "Verifying…" : "Verify & continue"}
          </button>

          <p className="text-gray-300 text-center text-sm">
            Not you?{" "}
            <button
              type="button"
              className="text-yellow-400 hover:underline"
              onClick={async () => {
                await signOut();
                router.replace("/signin");
              }}
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

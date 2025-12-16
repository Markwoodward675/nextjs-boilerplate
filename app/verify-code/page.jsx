"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureUserBootstrap,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  signOut,
  getErrorMessage,
} from "../../lib/api";

export default function VerifyCodePage() {
  const router = useRouter();

  const [boot, setBoot] = useState(null);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canVerify = useMemo(() => /^\d{6}$/.test(code), [code]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
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
        setErr(getErrorMessage(e, "Session check failed. Please sign in again."));
        setBoot(null);
      } finally {
        if (!cancelled) setLoading(false);
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
    setLoading(true);
    try {
      await createOrRefreshVerifyCode(boot.user.$id);
      setMsg("Verification code sent to your email.");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to send verification code email."));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await verifySixDigitCode(boot.user.$id, code);
      router.replace("/dashboard");
    } catch (e) {
      setErr(getErrorMessage(e, "Invalid or expired code."));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !boot) {
    return <div className="cardSub">Checking your session…</div>;
  }

  if (!boot?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md bg-black/80 border border-yellow-500 rounded-xl p-6">
          <div className="text-yellow-400 text-2xl font-bold text-center">Day Trader</div>
          <div className="text-gray-300 text-center mt-2">Please sign in again.</div>
          {err ? (
            <div className="mt-4 bg-red-600/20 border border-red-500 text-red-200 p-3 rounded">
              {err}
            </div>
          ) : null}
          <a
            href="/signin"
            className="mt-6 block w-full p-3 rounded bg-yellow-500 text-black font-bold text-center hover:bg-yellow-400 transition"
          >
            Go to Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[url('https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center px-4">
      <div className="w-full max-w-md bg-black/85 border border-yellow-500 rounded-xl p-6 shadow-lg backdrop-blur">
        <div className="text-yellow-400 text-3xl font-extrabold text-center">Day Trader</div>
        <div className="text-gray-300 text-center mt-2">
          Secure verification required to unlock your dashboard.
        </div>

        <div className="mt-4 text-gray-200 text-sm text-center">
          Signed in as <span className="text-yellow-300 font-semibold">{boot.user.email}</span>
        </div>

        {err ? (
          <div className="mt-4 bg-red-600/20 border border-red-500 text-red-200 p-3 rounded">
            {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mt-4 bg-emerald-600/15 border border-emerald-500 text-emerald-200 p-3 rounded">
            {msg}
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <button
            className="w-full p-3 rounded bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition disabled:opacity-60"
            onClick={sendCode}
            disabled={loading}
          >
            {loading ? "Working…" : "Send verification code to my email"}
          </button>

          <div>
            <label className="block text-sm text-gray-200 mb-1">6-digit code</label>
            <input
              className="w-full p-3 rounded bg-black/50 text-white border border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 tracking-[0.35em] text-center font-bold"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
            />
            <div className="text-gray-400 text-xs mt-2">
              The code is sent to your registered email address.
            </div>
          </div>

          <button
            className="w-full p-3 rounded border border-yellow-500 text-yellow-300 font-bold hover:bg-yellow-500 hover:text-black transition disabled:opacity-60"
            onClick={verify}
            disabled={!canVerify || loading}
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>

          <div className="text-gray-300 text-center text-sm">
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
          </div>
        </div>
      </div>
    </div>
  );
}

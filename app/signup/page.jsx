"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, getErrorMessage } from "../../lib/api";
import { isAppwriteConfigured } from "../../lib/appwrite";

const ICON_SRC = "/icon.png"; // /public/icon.png

function isExistsError(e, msg) {
  return String(e?.code) === "409" || /already exists/i.test(String(msg || ""));
}

export default function SignupPage() {
  const router = useRouter();

  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setRef(sp.get("ref") || "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAppwriteConfigured) {
      setErr(
        "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel (Production + Preview), then redeploy."
      );
    }
  }, []);

  const can = useMemo(() => {
    if (!isAppwriteConfigured) return false;
    return Boolean(email.trim() && fullName.trim() && password && password.length >= 8);
  }, [email, fullName, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!isAppwriteConfigured) {
      setErr(
        "Appwrite is not configured. Please set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID and redeploy."
      );
      return;
    }

    setErr("");
    setBusy(true);

    try {
      const res = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        referralId: ref || "",
      });

      router.replace(res?.next || "/verify-code");
    } catch (e2) {
      const msg = getErrorMessage(e2, "Unable to create account.");

      // If user already exists, redirect to signin with prefilled email
      if (isExistsError(e2, msg)) {
        const q = `?email=${encodeURIComponent(email.trim())}`;
        router.replace(`/signin${q}`);
        return;
      }

      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#050814]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40 bg-purple-600/30" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40 bg-blue-600/30" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <div className="relative w-full max-w-md bg-black/55 border border-yellow-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-11 w-11 rounded-2xl border border-yellow-500/40 bg-black/60 flex items-center justify-center overflow-hidden">
            <img src={ICON_SRC} alt="Day Trader" className="h-9 w-9 object-contain" />
          </div>

          <div className="text-center">
            <div className="text-2xl font-extrabold text-yellow-400 leading-tight">
              Day Trader
            </div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-yellow-200/70">
              Markets • Wallets • Execution
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-yellow-100 font-semibold">Create account</p>
          <p className="text-slate-300 text-sm mt-1">
            Secure onboarding. A 6-digit verification code will be emailed to you.
          </p>
        </div>

        {err ? (
          <div className="mt-4 bg-red-600/15 border border-red-500/50 text-red-100 p-3 rounded-xl text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-fullname" className="block text-sm text-slate-200 mb-1">
              Full name
            </label>
            <input
              id="signup-fullname"
              name="fullName"
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-yellow-500/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              placeholder="Your name"
              autoComplete="name"
              disabled={!isAppwriteConfigured}
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-sm text-slate-200 mb-1">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-yellow-500/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={!isAppwriteConfigured}
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm text-slate-200 mb-1">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              className="w-full p-3 rounded-xl bg-black/40 text-white border border-yellow-500/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              disabled={!isAppwriteConfigured}
            />
            <div className="text-[12px] text-slate-400 mt-1">Minimum 8 characters.</div>
          </div>

          <button
            className="w-full p-3 rounded-xl bg-yellow-500 text-black font-extrabold hover:bg-yellow-400 transition shadow-[0_0_0_1px_rgba(245,158,11,.35),0_18px_40px_rgba(0,0,0,.55)] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Creating…" : "Create account"}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              className="w-full p-3 rounded-xl border border-yellow-500/35 text-yellow-100 hover:bg-yellow-500/10 transition text-center font-semibold"
              href="/signin"
            >
              Sign in
            </a>
            <a
              className="w-full p-3 rounded-xl border border-blue-400/25 text-slate-100 hover:bg-blue-500/10 transition text-center font-semibold"
              href="/forgot-password"
            >
              Forgot password
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

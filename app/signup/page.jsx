"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, getErrorMessage } from "../../lib/api";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";
const ICON_SRC = "/icon.png";

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
    } catch {
      setRef("");
    }
  }, []);

  const can = useMemo(() => {
    return fullName.trim() && email.trim() && password.length >= 8;
  }, [fullName, email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signUp({ fullName, email, password });
router.replace("/verify-code");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to create account."));
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
          <img src="/icon.png" alt="Day Trader" className="h-10 w-10 rounded-xl border border-yellow-500/50 bg-black/60 p-1" />

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
          <p className="text-gray-200 font-semibold">Create account</p>
          <p className="text-gray-300 text-sm mt-1">
            Secure onboarding. A 6-digit verification code will be emailed to you.
          </p>
        </div>

        {err ? (
          <div className="mt-4 bg-red-600/20 border border-red-500/70 text-red-100 p-3 rounded-lg text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">Full name</label>
            <input
              className="w-full p-3 rounded-lg bg-black/50 text-white border border-yellow-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Email</label>
            <input
              className="w-full p-3 rounded-lg bg-black/50 text-white border border-yellow-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Password</label>
            <input
              className="w-full p-3 rounded-lg bg-black/50 text-white border border-yellow-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            <div className="text-xs text-gray-400 mt-2">
              Minimum 8 characters.
            </div>
          </div>

          <button
            className="w-full p-3 rounded-lg bg-yellow-500 text-black font-extrabold hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Creating…" : "Create account"}
          </button>

          <p className="text-gray-300 text-center text-sm">
            Already have an account?{" "}
            <a className="text-yellow-400 hover:underline" href="/signin">
              Sign in
            </a>
          </p>

          {ref ? (
            <p className="text-[12px] text-gray-400 text-center">
              Referral attached: <span className="text-yellow-300 font-semibold">{ref}</span>
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

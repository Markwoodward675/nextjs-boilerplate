"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getErrorMessage } from "../../lib/api";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";
const ICON_SRC = "/icon.png"; // put your icon in /public/icon.png (or change path)

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => email.trim() && password, [email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signIn(email.trim(), password);
      router.replace("/verify-code");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to sign in."));
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
          <p className="text-gray-200 font-semibold">Sign in</p>
          <p className="text-gray-300 text-sm mt-1">
            Access your dashboard securely.
          </p>
        </div>

        {err ? (
          <div className="mt-4 bg-red-600/20 border border-red-500/70 text-red-100 p-3 rounded-lg text-sm">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
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
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            className="w-full p-3 rounded-lg bg-yellow-500 text-black font-extrabold hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-gray-300 text-center text-sm">
            New here?{" "}
            <a className="text-yellow-400 hover:underline" href="/signup">
              Create an account
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

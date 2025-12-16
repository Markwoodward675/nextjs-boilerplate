// app/forgot-password/page.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const BG =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=80";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const can = useMemo(() => email.trim().includes("@"), [email]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      // TODO: wire to Appwrite recovery or your API route later.
      // For now we keep UI + flow build-safe.
      await new Promise((r) => setTimeout(r, 650));
      setMsg("If this email exists, we’ve sent a password reset link.");
    } catch (e2) {
      setErr(e2?.message || "Unable to request password reset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-64px)] bg-black bg-cover bg-center px-4"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      <div className="min-h-[calc(100vh-64px)] bg-black/75 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-yellow-500/25 bg-black/70 shadow-2xl backdrop-blur p-6">
          {/* Brand header */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-yellow-500/40 bg-black/60 p-1 flex items-center justify-center">
              <img src="/icon.png" alt="Day Trader" className="h-7 w-7" />
            </div>
            <div className="text-center leading-tight">
              <div className="text-xl font-extrabold text-yellow-300">
                Day Trader
              </div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-amber-200/60">
                Secure Recovery
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-lg font-semibold text-amber-100/85">
              Forgot password
            </div>
            <div className="mt-1 text-[12px] text-amber-200/45">
              Enter your email to receive a reset link.
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200">
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
              {msg}
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12px] text-amber-200/55 mb-2">
                Email
              </label>
              <input
                className="w-full rounded-xl bg-black/60 text-amber-100/85 border border-yellow-500/25 px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/50"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Carded action button */}
            <button
              type="submit"
              disabled={!can || busy}
              className="group w-full rounded-2xl border border-yellow-500/25 bg-gradient-to-b from-yellow-500/20 via-orange-500/10 to-black/70 p-4 shadow-lg transition hover:-translate-y-[1px] hover:border-yellow-400/60 hover:shadow-yellow-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-sm font-extrabold text-yellow-300">
                    {busy ? "Sending…" : "Send reset link"}
                  </div>
                  <div className="mt-1 text-[12px] text-amber-200/45">
                    We’ll email you a secure reset link
                  </div>
                </div>
                <div className="h-9 w-9 rounded-xl border border-yellow-500/25 bg-black/60 flex items-center justify-center text-yellow-300 transition group-hover:border-yellow-400/60">
                  →
                </div>
              </div>
            </button>

            {/* Secondary links */}
            <div className="pt-2 flex items-center justify-between text-[12px]">
              <Link
                href="/signin"
                className="text-amber-200/55 hover:text-yellow-300 transition"
              >
                Back to sign in
              </Link>
              <Link
                href="/signup"
                className="text-amber-200/55 hover:text-yellow-300 transition"
              >
                Create account
              </Link>
            </div>
          </form>

          <div className="mt-6 text-center text-[11px] text-amber-200/30">
            © {new Date().getFullYear()} Day Trader
          </div>
        </div>
      </div>
    </div>
  );
}

// app/reset-password/page.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordWithRecovery } from "../../lib/api";

const BG =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=80";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const userId = sp.get("userId") || "";
  const secret = sp.get("secret") || "";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const can = useMemo(() => password.length >= 8 && userId && secret, [password, userId, secret]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      await resetPasswordWithRecovery(userId, secret, password);
      setMsg("Password updated. Redirecting to sign in…");
      setTimeout(() => router.replace("/signin"), 900);
    } catch (e2) {
      setErr(e2?.message || "Unable to reset password.");
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
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-xl border border-yellow-500/40 bg-black/60 p-1 flex items-center justify-center">
              <img src="/icon.png" alt="Day Trader" className="h-7 w-7" />
            </div>
            <div className="text-center leading-tight">
              <div className="text-xl font-extrabold text-yellow-300">Day Trader</div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-amber-200/60">
                Reset Password
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-lg font-semibold text-amber-100/85">
              Create a new password
            </div>
            <div className="mt-1 text-[12px] text-amber-200/45">
              Minimum 8 characters.
            </div>
          </div>

          {!userId || !secret ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200">
              Recovery link is invalid or expired. Please request a new reset link.
            </div>
          ) : null}

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
                New password
              </label>
              <input
                className="w-full rounded-xl bg-black/60 text-amber-100/85 border border-yellow-500/25 px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400/50"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={!can || busy}
              className="group w-full rounded-2xl border border-yellow-500/25 bg-gradient-to-b from-yellow-500/20 via-orange-500/10 to-black/70 p-4 shadow-lg transition hover:-translate-y-[1px] hover:border-yellow-400/60 hover:shadow-yellow-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <div className="text-sm font-extrabold text-yellow-300">
                    {busy ? "Updating…" : "Update password"}
                  </div>
                  <div className="mt-1 text-[12px] text-amber-200/45">
                    You’ll be redirected to sign in
                  </div>
                </div>
                <div className="h-9 w-9 rounded-xl border border-yellow-500/25 bg-black/60 flex items-center justify-center text-yellow-300 transition group-hover:border-yellow-400/60">
                  →
                </div>
              </div>
            </button>

            <div className="pt-2 flex items-center justify-between text-[12px]">
              <Link href="/signin" className="text-amber-200/55 hover:text-yellow-300 transition">
                Back to sign in
              </Link>
              <Link href="/forgot-password" className="text-amber-200/55 hover:text-yellow-300 transition">
                Request new link
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

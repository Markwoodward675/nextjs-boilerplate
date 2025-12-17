// app/reset-password/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { completePasswordRecovery, getErrorMessage } from "../../lib/api";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";

export default function ResetPasswordPage() {
  const [userId, setUserId] = useState("");
  const [secret, setSecret] = useState("");

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setUserId(sp.get("userId") || sp.get("user_id") || "");
      setSecret(sp.get("secret") || "");
    } catch {}
  }, []);

  const can = useMemo(() => password && password.length >= 8 && userId && secret, [password, userId, secret]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setOk("");
    setBusy(true);

    try {
      await completePasswordRecovery({ userId, secret, password });
      setOk("Password updated successfully. You can now sign in.");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to reset password."));
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
        <div className="flex items-center justify-center gap-3">
          <img
            src="/icon.png"
            alt="Day Trader"
            className="h-10 w-10 rounded-xl border border-yellow-500/50 bg-black/60 p-1"
          />
          <div className="text-center">
            <div className="text-2xl font-extrabold text-yellow-400 leading-tight">Day Trader</div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-yellow-200/80">
              Markets • Wallets • Execution
            </div>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-gray-200 font-semibold">Reset password</p>
          <p className="text-gray-300 text-sm mt-1">Choose a new password to regain access.</p>
        </div>

        {err ? (
          <div className="mt-4 bg-red-600/20 border border-red-500/70 text-red-100 p-3 rounded-lg text-sm">
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-4 bg-emerald-600/15 border border-emerald-400/40 text-emerald-100 p-3 rounded-lg text-sm">
            {ok}{" "}
            <a className="text-yellow-400 hover:underline" href="/signin">
              Sign in
            </a>
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">New password</label>
            <input
              className="w-full p-3 rounded-lg bg-black/50 text-white border border-yellow-500/70 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="password"
              value={password}
              onChange={(x) => setPassword(x.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <div className="text-[12px] text-gray-300 mt-2">Minimum 8 characters.</div>
          </div>

          <button
            className="w-full p-3 rounded-lg bg-yellow-500 text-black font-extrabold hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}

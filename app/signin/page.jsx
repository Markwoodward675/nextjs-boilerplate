"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getErrorMessage } from "../../lib/api";

const ICON_SRC = "/icon.png";

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // Optional: prefill email from ?email=...
    try {
      const sp = new URLSearchParams(window.location.search);
      const e = sp.get("email");
      if (e) setEmail(e);
    } catch {}
  }, []);

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
    <div className="dt-auth-bg">
      <div className="dt-auth-card">
        {/* Brand */}
        <div className="dt-auth-brand">
          <img
            src={ICON_SRC}
            alt="Day Trader"
            className="dt-auth-icon"
            draggable={false}
          />
          <div className="dt-auth-brandText">
            <div className="dt-auth-title">Day Trader</div>
            <div className="dt-auth-sub">Markets • Wallets • Execution</div>
          </div>
        </div>

        <div className="dt-auth-head">
          <div className="dt-auth-h1">Sign in</div>
          <div className="dt-auth-p">
            Secure access to your dashboard.
          </div>
        </div>

        {err ? <div className="dt-auth-error">{err}</div> : null}

        <form onSubmit={submit} className="dt-auth-form">
          <div>
            <label className="dt-auth-label">Email</label>
            <input
              className="dt-auth-input"
              type="email"
              value={email}
              onChange={(x) => setEmail(x.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="dt-auth-label">Password</label>
            <input
              className="dt-auth-input"
              type="password"
              value={password}
              onChange={(x) => setPassword(x.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            className="dt-auth-btn dt-auth-btn-primary"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="dt-auth-actions">
            <a className="dt-auth-btn dt-auth-btn-ghost" href="/signup">
              Create account
            </a>
            <a className="dt-auth-btn dt-auth-btn-ghost" href="/forgot-password">
              Forgot password
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

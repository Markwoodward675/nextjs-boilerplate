"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completePasswordRecovery, getErrorMessage, requestPasswordRecovery } from "../../lib/api";
import BrandLogo from "../../components/BrandLogo";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="dt-shell" style={{ padding: 24 }}><div className="dt-card">Loading…</div></div>}>
      <ForgotPasswordInner />
    </Suspense>
  );
}

function ForgotPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const userId = sp.get("userId") || "";
  const secret = sp.get("secret") || "";

  const isResetMode = useMemo(() => !!userId && !!secret, [userId, secret]);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submitRequest = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      await requestPasswordRecovery(email);
      setMsg("Password recovery email sent. Check your inbox (and spam).");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to send recovery email."));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      await completePasswordRecovery({
        userId,
        secret,
        password: pw,
        confirmPassword: pw2,
      });

      setMsg("Password updated successfully. Redirecting to sign in…");
      setTimeout(() => router.replace("/signin"), 800);
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to reset password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-auth-wrap">
      <div className="dt-auth-card">
        <div className="dt-auth-head">
          <div className="dt-auth-mark" aria-hidden>
            <BrandLogo size={28} />
          </div>
          <div>
            <div className="dt-auth-title">Day Trader</div>
            <div className="dt-auth-sub">Secure access recovery</div>
          </div>
        </div>

        <div className="dt-auth-body">
          <div className="dt-h2" style={{ marginBottom: 6 }}>
            {isResetMode ? "Set a new password" : "Forgot password"}
          </div>

          <div className="dt-subtle">
            {isResetMode
              ? "Enter a new password for your account."
              : "Enter your email to receive a password recovery link."}
          </div>

          {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
          {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

          {!isResetMode ? (
            <form onSubmit={submitRequest} className="dt-form" style={{ marginTop: 14 }}>
              <label className="dt-label">Email</label>
              <input
                className="dt-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <button className="dt-btn dt-btn-primary" disabled={!email.trim() || busy} type="submit">
                {busy ? "Sending…" : "Send recovery link"}
              </button>

              <div className="dt-subtle" style={{ marginTop: 10 }}>
                Remembered your password?{" "}
                <a className="dt-link" href="/signin">
                  Sign in
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={submitReset} className="dt-form" style={{ marginTop: 14 }}>
              <label className="dt-label">New password</label>
              <input
                className="dt-input"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />

              <label className="dt-label">Confirm new password</label>
              <input
                className="dt-input"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />

              <button className="dt-btn dt-btn-primary" disabled={pw.length < 8 || pw !== pw2 || busy} type="submit">
                {busy ? "Updating…" : "Reset password"}
              </button>

              <div className="dt-subtle" style={{ marginTop: 10 }}>
                Back to{" "}
                <a className="dt-link" href="/signin">
                  Sign in
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, getErrorMessage } from "../../lib/api";

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
    // build-safe query read
    try {
      const sp = new URLSearchParams(window.location.search);
      setRef(sp.get("ref") || "");
      const prefillEmail = sp.get("email");
      if (prefillEmail) setEmail(prefillEmail);
    } catch {}
  }, []);

  const can = useMemo(() => {
    return (
      fullName.trim().length > 1 &&
      email.trim().length > 4 &&
      password.length >= 8
    );
  }, [fullName, email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      // ✅ Uses object signature (matches the hardfixed lib/api.js)
      const out = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        referralId: ref || "",
      });

      // ✅ Your rule:
      // - existing + verified -> /signin
      // - existing + unverified -> /verify-code
      router.replace(out?.next || "/verify-code");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to create account."));
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
          <div className="dt-auth-h1">Create account</div>
          <div className="dt-auth-p">
            Secure onboarding. A 6-digit verification code will be emailed to you.
          </div>
        </div>

        {err ? <div className="dt-auth-error">{err}</div> : null}

        <form onSubmit={submit} className="dt-auth-form">
          <div>
            <label className="dt-auth-label">Full name</label>
            <input
              className="dt-auth-input"
              value={fullName}
              onChange={(x) => setFullName(x.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

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
              autoComplete="new-password"
            />
            <div className="dt-auth-hint">Minimum 8 characters.</div>
          </div>

          <button
            className="dt-auth-btn dt-auth-btn-primary"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Creating…" : "Create account"}
          </button>

          <div className="dt-auth-actions">
            <a className="dt-auth-btn dt-auth-btn-ghost" href="/signin">
              Sign in
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

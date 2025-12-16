"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getErrorMessage } from "../../lib/api";

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => String(email).trim() && String(password), [email, password]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);

    try {
      // supports both signatures in your lib/api.js (email,password or object)
      await signIn(email, password);
      router.replace("/verify-code");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to sign in."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-bg">
      <div className="shell">
        <div className="contentCard">
          <div className="contentInner">
            <div className="card">
              <div className="cardTitle">Welcome back</div>
              <p className="cardSub">Sign in with your email and password to continue.</p>
            </div>

            {err ? (
              <div className="flashError" style={{ marginTop: 12 }}>
                {err}
              </div>
            ) : null}

            <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>
                  Email
                </div>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>
                  Password
                </div>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <button className="btnPrimary" disabled={!can || busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>

              <div className="cardSub">
                New here?{" "}
                <a href="/signup" style={{ color: "rgba(56,189,248,.95)" }}>
                  Create an account
                </a>
              </div>
            </form>

            <div className="cardSub" style={{ marginTop: 10, opacity: 0.8 }}>
              Tip: After signing in, you’ll verify with a one-time 6-digit code sent to your email.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

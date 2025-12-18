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
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          {/* Brand header */}
          <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                height: 44,
                width: 44,
                borderRadius: 14,
                border: "1px solid rgba(245,158,11,.55)",
                background: "rgba(0,0,0,.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img src="/icon.png" alt="Day Trader" style={{ height: 34, width: 34, borderRadius: 10 }} />
            </div>

            <div style={{ flex: 1 }}>
              <div className="cardTitle" style={{ marginBottom: 2 }}>Day Trader</div>
              <div className="cardSub">Markets • Wallets • Execution</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="cardTitle">Sign in</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Secure access to your dashboard.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(x) => setEmail(x.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Password</div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(x) => setPassword(x.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="card" style={{ display: "grid", gap: 8 }}>
              <a className="pillBtn" href="/signup">Create account</a>
              <a className="pillBtn" href="/forgot-password">Forgot password</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

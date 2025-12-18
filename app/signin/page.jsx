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
          <div className="card">
            <div className="cardTitle">Sign in</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Secure access to your dashboard.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
              <input className="input" type="email" value={email} onChange={(x) => setEmail(x.target.value)} />
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Password</div>
              <input className="input" type="password" value={password} onChange={(x) => setPassword(x.target.value)} />
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="cardSub" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/signup" style={{ color: "rgba(245,158,11,.95)" }}>Create account</a>
              <span style={{ opacity: 0.5 }}>•</span>
              <a href="/forgot-password" style={{ color: "rgba(245,158,11,.95)" }}>Forgot password</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

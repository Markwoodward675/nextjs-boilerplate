"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "../../lib/api";

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => email && password, [email, password]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/verify-code");
    } catch (e2) {
      setErr(e2?.message || "Unable to sign in.");
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
              <div className="cardTitle">Sign in</div>
              <p className="cardSub">Enter your email and password.</p>
            </div>

            {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

            <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>Password</div>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <button className="btnPrimary" disabled={!can || busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>

              <div className="cardSub">
                New here?{" "}
                <a href="/signup" style={{ color: "rgba(56,189,248,.95)" }}>Create an account</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

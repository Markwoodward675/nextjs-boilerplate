"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const ref = sp.get("ref") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(
    () => email && password && fullName && password.length >= 8,
    [email, password, fullName]
  );

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await signUp({ fullName, email, password, referralId: ref || "" });
      router.replace("/verify-code");
    } catch (e2) {
      setErr(e2?.message || "Unable to create account.");
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
              <div className="cardTitle">Create your Day Trader account</div>
              <p className="cardSub">Secure access to your dashboard and services.</p>
            </div>

            {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

            <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>Full name</div>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>Password</div>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="cardSub" style={{ marginTop: 6 }}>Minimum 8 characters.</div>
              </div>

              <button className="btnPrimary" disabled={!can || busy}>
                {busy ? "Creating…" : "Create account"}
              </button>

              <div className="cardSub">
                Already have an account?{" "}
                <a href="/signin" style={{ color: "rgba(56,189,248,.95)" }}>Sign in</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

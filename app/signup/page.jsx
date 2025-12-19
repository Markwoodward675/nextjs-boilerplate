"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, ensureUserBootstrap, signOut, getErrorMessage } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();

  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setRef(sp.get("ref") || "");
    } catch {
      setRef("");
    }
  }, []);

  const can = useMemo(() => {
    return fullName.trim() && email.trim() && password.length >= 8;
  }, [fullName, email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signUp({ fullName, email: email.trim(), password, referralId: ref || "" });

      const boot = await ensureUserBootstrap().catch(() => null);
      if (boot?.profile?.verificationCodeVerified) {
        // verified already (rare) -> go signin
        await signOut();
        router.replace(`/signin?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      router.replace("/verify-code");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to create account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 26 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Create account</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Secure onboarding. A 6-digit verification code will be emailed to you.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

          <form onSubmit={submit} className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
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

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Creating…" : "Create account"}
            </button>

            <div className="cardSub" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a className="dtLink" href="/signin">Sign in</a>
              <a className="dtLink" href="/forgot-password">Forgot password</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

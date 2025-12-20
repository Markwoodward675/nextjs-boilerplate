// app/signup/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signUp,
  signIn,
  signOut,
  ensureUserBootstrap,
  getErrorMessage,
} from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [ref, setRef] = useState("");
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

  async function handleExistingAccount() {
    const e = email.trim().toLowerCase();

    // Try login with what user typed.
    try {
      await signIn(e, password);
      const boot = await ensureUserBootstrap();

      if (boot?.profile?.verificationCodeVerified) {
        // registered + verified -> go signin (per your rule)
        await signOut();
        router.replace(`/signin?email=${encodeURIComponent(e)}`);
        return;
      }

      // registered but not verified -> go verify
      router.replace("/verify-code");
      return;
    } catch {
      // Wrong password: push them to signin, and they can continue to verify
      router.replace(`/signin?email=${encodeURIComponent(e)}&next=/verify-code`);
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signUp({
        fullName,
        email: email.trim(),
        password,
        referralId: ref || "",
      });

      // After successful signup, go verify.
      router.replace("/verify-code");
    } catch (e2) {
      // Existing account
      if (e2?.code === 409 || e2?.message === "USER_EXISTS") {
        await handleExistingAccount();
        return;
      }

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

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Full name</div>
              <input className="input" value={fullName} onChange={(x) => setFullName(x.target.value)} />
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
              <input className="input" type="email" value={email} onChange={(x) => setEmail(x.target.value)} />
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Password</div>
              <input className="input" type="password" value={password} onChange={(x) => setPassword(x.target.value)} />
              <div className="cardSub" style={{ marginTop: 6 }}>Minimum 8 characters.</div>
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Creating…" : "Create account"}
            </button>

            <div className="cardSub" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/signin" style={{ color: "rgba(245,158,11,.95)" }}>Sign in</a>
              <a href="/forgot-password" style={{ color: "rgba(245,158,11,.95)" }}>Forgot password</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

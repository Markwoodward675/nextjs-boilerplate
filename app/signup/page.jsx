"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn, signOut, ensureUserBootstrap, getAccountStatusByEmail, getErrorMessage } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [ref, setRef] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // read ?ref=... without useSearchParams (build-safe)
    try {
      const sp = new URLSearchParams(window.location.search);
      setRef(sp.get("ref") || "");
    } catch {
      setRef("");
    }
  }, []);

  const can = useMemo(() => {
    return email.trim() && fullName.trim() && password && password.length >= 8;
  }, [email, fullName, password]);

  const handleExistingAccount = async () => {
    const e = email.trim().toLowerCase();

    // 1) Try sign-in using what the user typed (best UX)
    try {
      await signIn(e, password);
      const boot = await ensureUserBootstrap();

      if (boot?.profile?.verificationCodeVerified) {
        // user is verified -> send to signin page (per your rule) and end session
        await signOut();
        router.replace(`/signin?email=${encodeURIComponent(e)}`);
        return;
      }

      // user exists but not verified -> go verify
      router.replace("/verify-code");
      return;
    } catch {
      // ignore — could be wrong password
    }

    // 2) If sign-in failed, ask server if verified
    const status = await getAccountStatusByEmail(e).catch(() => null);

    if (status?.verified) {
      router.replace(`/signin?email=${encodeURIComponent(e)}`);
      return;
    }

    // exists but not verified (or status unknown): send to signin but push to verify next
    router.replace(`/signin?email=${encodeURIComponent(e)}&next=/verify-code`);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signUp({ fullName, email: email.trim(), password, referralId: ref || "" });
      router.replace("/verify-code");
    } catch (e2) {
      const msg = getErrorMessage(e2, "Unable to create account.");

      // Appwrite conflict (existing user)
      if (/already exists/i.test(msg) || String(e2?.code) === "409") {
        await handleExistingAccount();
        return;
      }

      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
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

            <div className="cardSub">
              Already have an account?{" "}
              <a href="/signin" style={{ color: "rgba(245,158,11,.95)" }}>Sign in</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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

  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // build-safe query parsing (no useSearchParams needed)
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

  async function handleExistingAccount(eMsg) {
    const e = email.trim().toLowerCase();

    // Best-case UX: if the password they typed is correct, sign in and detect verified.
    try {
      await signIn(e, password);
      const boot = await ensureUserBootstrap().catch(() => null);

      if (boot?.profile?.verificationCodeVerified) {
        // Verified user -> send to sign in page, and end session per your rule
        await signOut();
        router.replace(`/signin?email=${encodeURIComponent(e)}`);
        return;
      }

      // Exists but not verified -> go verify
      router.replace("/verify-code");
      return;
    } catch {
      // Wrong password or cannot sign in; we can't reliably know verified status
    }

    // Fallback:
    // send them to sign in; if they truly exist and aren’t verified, they can sign in then verify.
    router.replace(`/signin?email=${encodeURIComponent(e)}`);
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
      router.replace("/verify-code");
    } catch (e2) {
      const msg = getErrorMessage(e2, "Unable to create account.");

      // Appwrite conflict (existing user)
      if (/already exists/i.test(msg) || String(e2?.code) === "409") {
        await handleExistingAccount(msg);
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
              <input
                className="input"
                type="password"
                value={password}
                onChange={(x) => setPassword(x.target.value)}
              />
              <div className="cardSub" style={{ marginTop: 6 }}>Minimum 8 characters.</div>
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Creating…" : "Create account"}
            </button>

            <div className="card" style={{ display: "grid", gap: 8 }}>
              <a className="pillBtn" href="/signin">Sign in</a>
              <a className="pillBtn" href="/forgot-password">Forgot password</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

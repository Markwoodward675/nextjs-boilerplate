"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { completePasswordRecovery, getErrorMessage } from "../../lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [secret, setSecret] = useState("");

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setUserId(sp.get("userId") || "");
      setSecret(sp.get("secret") || "");
    } catch {
      setUserId("");
      setSecret("");
    }
  }, []);

  const can = useMemo(() => {
    return userId && secret && password.length >= 8 && password === passwordAgain;
  }, [userId, secret, password, passwordAgain]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setOk("");
    setBusy(true);

    try {
      await completePasswordRecovery({ userId, secret, password, passwordAgain });
      setOk("Password updated. Redirecting to sign in…");
      setTimeout(() => router.replace("/signin"), 800);
    } catch (ex) {
      setErr(getErrorMessage(ex, "Invalid recovery link."));
    } finally {
      setBusy(false);
    }
  };

  const invalidLink = !userId || !secret;

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Reset password</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Choose a new password to regain access.
            </div>
          </div>

          {invalidLink ? (
            <div className="flashError" style={{ marginTop: 12 }}>
              Invalid recovery link.
            </div>
          ) : null}

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
          {ok ? <div className="flashOk" style={{ marginTop: 12 }}>{ok}</div> : null}

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {/* hidden username field for accessibility hint */}
            <input type="text" autoComplete="username" value={""} readOnly hidden />

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>New password</div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(x) => setPassword(x.target.value)}
                autoComplete="new-password"
              />
              <div className="cardSub" style={{ marginTop: 6 }}>Minimum 8 characters.</div>
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Confirm password</div>
              <input
                className="input"
                type="password"
                value={passwordAgain}
                onChange={(x) => setPasswordAgain(x.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button className="btnPrimary" disabled={!can || busy || invalidLink} type="submit">
              {busy ? "Updating…" : "Update password"}
            </button>

            <div className="cardSub">
              <a href="/signin" style={{ color: "rgba(56,189,248,.95)" }}>Back to Sign in</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

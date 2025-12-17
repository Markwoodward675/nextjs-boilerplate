"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { requestPasswordRecovery, getErrorMessage } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const can = useMemo(() => email.trim().includes("@"), [email]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setOk("");
    setBusy(true);

    try {
      await requestPasswordRecovery(email.trim());
      setOk("Recovery link sent. Check your email and follow the instructions to reset your password.");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to send recovery email."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Reset your password</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Enter your account email. We’ll send a secure recovery link.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
          {ok ? <div className="flashOk" style={{ marginTop: 12 }}>{ok}</div> : null}

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

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Sending…" : "Send recovery email"}
            </button>

            <div className="cardSub" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signin" style={{ color: "rgba(245,158,11,.95)" }}>Back to sign in</Link>
              <span style={{ opacity: 0.6 }}>•</span>
              <Link href="/signup" style={{ color: "rgba(245,158,11,.95)" }}>Create account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

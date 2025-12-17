"use client";

import { useMemo, useState } from "react";
import { requestPasswordRecovery, getErrorMessage } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const can = useMemo(() => !!email.trim(), [email]);

  const submit = async (e) => {
    e.preventDefault();
    if (!can || busy) return;

    setBusy(true);
    setErr("");
    setOk("");

    try {
      await requestPasswordRecovery(email.trim());
      setOk("Recovery email sent. Check your inbox to continue.");
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
            <div className="cardSub" style={{ marginTop: 8 }}>
              Enter your account email. We’ll send a secure recovery link.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
          {ok ? <div className="flashOk" style={{ marginTop: 12 }}>{ok}</div> : null}

          <form onSubmit={submit} className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button className="btnPrimary" type="submit" disabled={!can || busy}>
              {busy ? "Sending…" : "Send recovery link"}
            </button>

            <div className="cardSub">
              Remembered it?{" "}
              <a href="/signin" style={{ color: "rgba(56,189,248,.95)" }}>
                Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

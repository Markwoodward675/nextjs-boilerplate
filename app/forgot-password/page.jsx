"use client";

import { useMemo, useState } from "react";
import { sendRecoveryEmail, getErrorMessage } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const can = useMemo(() => email.trim(), [email]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setOk("");
    setBusy(true);

    try {
      await sendRecoveryEmail(email.trim());
      setOk("Recovery email sent. Check your inbox.");
    } catch (ex) {
      setErr(getErrorMessage(ex, "Unable to send recovery email."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Forgot password</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              We’ll email a secure recovery link.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
          {ok ? <div className="flashOk" style={{ marginTop: 12 }}>{ok}</div> : null}

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
              <input className="input" type="email" value={email} onChange={(x) => setEmail(x.target.value)} />
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Sending…" : "Send recovery email"}
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

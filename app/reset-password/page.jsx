// app/reset-password/page.jsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completePasswordRecovery, getErrorMessage } from "../../lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const userId = sp.get("userId") || "";
  const secret = sp.get("secret") || "";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const can = useMemo(() => password.length >= 8 && userId && secret, [password, userId, secret]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setOk("");
    setBusy(true);

    try {
      await completePasswordRecovery({ userId, secret, password });
      setOk("Password updated. Redirecting to sign in…");
      setTimeout(() => router.replace("/signin"), 800);
    } catch (e2) {
      setErr(getErrorMessage(e2, "Invalid recovery link."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 26 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Reset password</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Choose a new password to regain access.
            </div>
          </div>

          {!userId || !secret ? (
            <div className="flashError" style={{ marginTop: 12 }}>
              Invalid recovery link.
            </div>
          ) : null}

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
          {ok ? <div className="flashOk" style={{ marginTop: 12 }}>{ok}</div> : null}

          <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>New password</div>
              <input className="input" type="password" value={password} onChange={(x) => setPassword(x.target.value)} />
              <div className="cardSub" style={{ marginTop: 6 }}>Minimum 8 characters.</div>
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

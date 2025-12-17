"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordRecovery, getErrorMessage } from "../../lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
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
      setOk("Password reset link sent. Check your email inbox/spam.");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to send reset link."));
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
              Enter your email. We’ll send a secure password reset link.
            </div>
          </div>

          {err ? (
            <div className="flashError" style={{ marginTop: 12 }}>
              {err}
            </div>
          ) : null}

          {ok ? (
            <div className="flashOk" style={{ marginTop: 12 }}>
              {ok}
            </div>
          ) : null}

          <form
            onSubmit={submit}
            style={{ marginTop: 12, display: "grid", gap: 10 }}
          >
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>
                Email
              </div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Sending…" : "Send reset link"}
            </button>

            <div className="cardSub">
              Remembered it?{" "}
              <a
                href="/signin"
                style={{ color: "rgba(56,189,248,.95)" }}
              >
                Sign in
              </a>
            </div>

            <button
              className="pillBtn"
              type="button"
              onClick={() => router.push("/")}
              style={{ justifySelf: "start" }}
            >
              ← Back to home
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

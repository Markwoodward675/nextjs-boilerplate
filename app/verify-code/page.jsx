"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureUserBootstrap,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  getErrorMessage,
} from "../../lib/api";

export default function VerifyCodePage() {
  const router = useRouter();

  const [boot, setBoot] = useState(null); // { user, profile }
  const [busy, setBusy] = useState(true);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canVerify = useMemo(() => /^\d{6}$/.test(code), [code]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setBusy(true);
      setErr("");
      setMsg("");

      try {
        const b = await ensureUserBootstrap();
        if (cancelled) return;

        if (!b?.user) {
          router.replace("/signin");
          return;
        }

        // Already verified -> go dashboard
        if (b?.profile?.verificationCodeVerified) {
          router.replace("/dashboard");
          return;
        }

        setBoot(b);
      } catch (e) {
        setErr(getErrorMessage(e, "Bootstrap failed. Please sign in again."));
        router.replace("/signin");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const sendCode = async () => {
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await createOrRefreshVerifyCode(boot.user.$id);
      setMsg("A new 6-digit code was generated. Check your Alerts.");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to generate code."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await verifySixDigitCode(boot.user.$id, code);
      setMsg("Verified! Redirecting…");
      router.replace("/dashboard");
    } catch (e) {
      setErr(getErrorMessage(e, "Invalid or expired code."));
    } finally {
      setBusy(false);
    }
  };

  if (busy && !boot) return <div className="cardSub">Checking your session…</div>;
  if (!boot?.user) return <div className="cardSub">Redirecting…</div>;

  return (
    <div className="contentCard">
      <div className="contentInner">
        <div className="card">
          <div className="cardTitle">Verify your account</div>
          <div className="cardSub" style={{ marginTop: 6 }}>
            We need to verify your Day Trader account with a 6-digit code before you can access your dashboard.
          </div>
          <div className="cardSub" style={{ marginTop: 10 }}>
            Signed in as <b>{boot.user.email}</b>.
          </div>
        </div>

        {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
        {msg ? <div className="flashOk" style={{ marginTop: 12 }}>{msg}</div> : null}

        <div className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <button className="btnPrimary" onClick={sendCode} disabled={busy}>
            {busy ? "Working…" : "Send / regenerate 6-digit code"}
          </button>

          <div>
            <div className="cardSub" style={{ marginBottom: 6 }}>Enter 6-digit code</div>
            <input
              className="input"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
            />
            <div className="cardSub" style={{ marginTop: 6 }}>
              Enter the code we generated for your account (you’ll see it in Alerts).
            </div>
          </div>

          <button className="btnPrimary" onClick={verify} disabled={!canVerify || busy}>
            {busy ? "Verifying…" : "Verify code"}
          </button>

          <div className="cardSub">
            Not you?{" "}
            <a href="/signout" style={{ color: "rgba(56,189,248,.95)" }}>
              Sign out
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

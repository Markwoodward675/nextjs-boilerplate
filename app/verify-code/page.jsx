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
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canVerify = useMemo(() => /^\d{6}$/.test(code), [code]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      setMsg("");

      try {
        const b = await ensureUserBootstrap();
        if (cancelled) return;

        if (!b?.user) {
          router.replace("/signin");
          return;
        }

        // Already verified
        if (b?.profile?.verificationCodeVerified) {
          router.replace("/dashboard");
          return;
        }

        setBoot(b);
      } catch (e) {
        if (!cancelled) {
          setErr(getErrorMessage(e, "We couldn’t confirm your session. Please sign in again."));
          router.replace("/signin");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const sendCode = async () => {
    if (busy || !boot?.user?.$id) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      await createOrRefreshVerifyCode(boot.user.$id);
      setMsg("Verification code sent to your email.");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to send verification code."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (busy || !boot?.user?.$id) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      await verifySixDigitCode(boot.user.$id, code);
      setMsg("Verified. Redirecting…");
      router.replace("/dashboard");
    } catch (e) {
      setErr(getErrorMessage(e, "Invalid or expired code."));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !boot) return <div className="cardSub">Checking your session…</div>;
  if (!boot?.user) return <div className="cardSub">Redirecting…</div>;

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Secure verification required</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Enter the 6-digit code sent to your email to unlock the dashboard.
            </div>
            <div className="cardSub" style={{ marginTop: 10 }}>
              Signed in as <b>{boot.user.email}</b>
            </div>
          </div>

          {err ? (
            <div className="flashError" style={{ marginTop: 12 }}>
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="flashOk" style={{ marginTop: 12 }}>
              {msg}
            </div>
          ) : null}

          <div className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <button className="btnPrimary" onClick={sendCode} disabled={busy}>
              {busy ? "Working…" : "Send verification code to my email"}
            </button>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>
                6-digit code
              </div>
              <input
                className="input"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="••••••"
              />
              <div className="cardSub" style={{ marginTop: 6 }}>
                The code is sent to your registered email address.
              </div>
            </div>

            <button className="btnPrimary" onClick={verify} disabled={!canVerify || busy}>
              {busy ? "Verifying…" : "Verify & continue"}
            </button>

            <div className="cardSub">
              Not you?{" "}
              <a href="/signout" className="dt-link">
                Sign out
              </a>
            </div>
          </div>

          <div className="cardSub" style={{ marginTop: 10, opacity: 0.8 }}>
            Tip: if you don’t see the code, check Spam/Promotions and confirm your Resend sender
            email is verified.
          </div>
        </div>
      </div>
    </div>
  );
}

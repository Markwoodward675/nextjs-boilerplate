"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sentOnceRef = useRef(false);

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

        if (!b?.user?.$id) {
          router.replace("/signin?next=/verify-code");
          return;
        }

        // Already verified -> go to app
        if (b?.profile?.verificationCodeVerified) {
          router.replace("/overview");
          return;
        }

        setBoot(b);

        // Auto-send once when page loads (only once per visit)
        if (!sentOnceRef.current) {
          sentOnceRef.current = true;
          try {
            setSending(true);
            await createOrRefreshVerifyCode(b.user.$id);
            if (!cancelled) setMsg("Verification code sent to your email.");
          } catch (e) {
            if (!cancelled) setErr(getErrorMessage(e, "Unable to send verification code."));
          } finally {
            if (!cancelled) setSending(false);
          }
        }
      } catch (e) {
        const message = getErrorMessage(
          e,
          "We couldn’t confirm your session. Please sign in again."
        );

        if (!cancelled) {
          setErr(message);

          // ✅ IMPORTANT CHANGE:
          // Do NOT auto-redirect to /debug-appwrite. It causes a trap when caches/env drift.
          // Instead: show the message and let the user retry / sign out / go sign in again.
          //
          // If DB really is missing, the error is visible here and you can fix env + redeploy.
          // If it's a transient/cached mismatch, a hard refresh or redeploy fixes it.
          if (/database\s*\(db_id\)\s*is not configured/i.test(message)) {
            // Stay on this page so the user sees the error.
            // Optional: you can show a helpful tip.
            setMsg("Tip: If you just updated Vercel env vars, redeploy with 'clear build cache'.");
          } else {
            router.replace("/signin?next=/verify-code");
          }
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
    if (!boot?.user?.$id || sending || verifying) return;

    setErr("");
    setMsg("");
    setSending(true);

    try {
      await createOrRefreshVerifyCode(boot.user.$id);
      setMsg("Verification code sent to your email.");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to send verification code."));
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (!boot?.user?.$id || verifying || sending) return;
    if (!canVerify) return;

    setErr("");
    setMsg("");
    setVerifying(true);

    try {
      await verifySixDigitCode(boot.user.$id, code);
      setMsg("Verified. Redirecting…");
      router.replace("/overview");
      router.refresh();
    } catch (e) {
      setErr(getErrorMessage(e, "Invalid or expired code."));
    } finally {
      setVerifying(false);
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
              Enter the 6-digit code sent to your email to unlock the app.
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
            <button className="btnPrimary" onClick={sendCode} disabled={sending || verifying}>
              {sending ? "Sending…" : "Send verification code to my email"}
            </button>

            <div>
              <label
                htmlFor="verify-code"
                className="cardSub"
                style={{ marginBottom: 6, display: "block" }}
              >
                6-digit code
              </label>

              <input
                id="verify-code"
                name="verificationCode"
                className="input"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                autoComplete="one-time-code"
              />

              <div className="cardSub" style={{ marginTop: 6 }}>
                The code is sent to your registered email address.
              </div>
            </div>

            <button
              className="btnPrimary"
              onClick={verify}
              disabled={!canVerify || sending || verifying}
            >
              {verifying ? "Verifying…" : "Verify & continue"}
            </button>

            <div className="cardSub">
              Not you?{" "}
              <a href="/signout" className="dt-link">
                Sign out
              </a>
            </div>
          </div>

          <div className="cardSub" style={{ marginTop: 10, opacity: 0.8 }}>
            Tip: if you don’t see the code, check Spam/Promotions and confirm your sender email is verified.
          </div>
        </div>
      </div>
    </div>
  );
}

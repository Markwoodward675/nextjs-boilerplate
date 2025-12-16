"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureUserBootstrap,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  signOut,
  getErrorMessage,
} from "../../lib/api";

export default function VerifyCodePage() {
  const router = useRouter();

  const [boot, setBoot] = useState(null); // { user, profile }
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

        // already verified
        if (b?.profile?.verificationCodeVerified) {
          router.replace("/dashboard");
          return;
        }

        setBoot(b);
      } catch (e) {
        if (!cancelled) {
          setBoot(null);
          setErr(getErrorMessage(e, "We couldn’t confirm your session. Please sign in again."));
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
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await createOrRefreshVerifyCode(boot.user.$id);
      setMsg("Verification code sent. Check your email inbox (and spam/junk folder).");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to send verification code email."));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!boot?.user?.$id) return;
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await verifySixDigitCode(boot.user.$id, code);
      router.replace("/dashboard");
    } catch (e) {
      setErr(getErrorMessage(e, "Invalid or expired code."));
    } finally {
      setLoading(false);
    }
  };

  // Session checking state
  if (loading && !boot) {
    return (
      <div className="page-bg">
        <div className="shell">
          <div className="contentCard">
            <div className="contentInner">
              <div className="card">
                <div className="cardTitle">Checking your session…</div>
                <div className="cardSub" style={{ marginTop: 6 }}>
                  Please wait a moment.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No session
  if (!boot?.user) {
    return (
      <div className="page-bg">
        <div className="shell">
          <div className="contentCard">
            <div className="contentInner">
              <div className="card">
                <div className="cardTitle">Verify your account</div>
                <div className="cardSub" style={{ marginTop: 6 }}>
                  We couldn’t confirm your session. Please sign in again.
                </div>
              </div>

              {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

              <a
                href="/signin"
                className="btnPrimary"
                style={{ marginTop: 12, display: "inline-flex", justifyContent: "center", textDecoration: "none" }}
              >
                Go to Sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verified flow UI
  return (
    <div className="page-bg">
      <div className="shell">
        <div className="contentCard">
          <div className="contentInner">
            <div className="card">
              <div className="cardTitle">Verify your account</div>
              <div className="cardSub" style={{ marginTop: 6 }}>
                A secure one-time code has been sent to your email to unlock your dashboard.
              </div>
              <div className="cardSub" style={{ marginTop: 10 }}>
                Signed in as <b>{boot.user.email}</b>
              </div>
            </div>

            {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
            {msg ? <div className="flashOk" style={{ marginTop: 12 }}>{msg}</div> : null}

            <div className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <button className="btnPrimary" onClick={sendCode} disabled={loading}>
                {loading ? "Working…" : "Send verification code to my email"}
              </button>

              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>6-digit code</div>
                <input
                  className="input"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  style={{ letterSpacing: "0.35em", textAlign: "center", fontWeight: 800 }}
                />
                <div className="cardSub" style={{ marginTop: 6 }}>
                  The code is sent to your registered email address.
                </div>
              </div>

              <button className="btnPrimary" onClick={verify} disabled={!canVerify || loading}>
                {loading ? "Verifying…" : "Verify & continue"}
              </button>

              <div className="cardSub">
                Not you?{" "}
                <button
                  type="button"
                  className="linkBtn"
                  onClick={async () => {
                    await signOut();
                    router.replace("/signin");
                  }}
                  style={{ color: "rgba(56,189,248,.95)", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className="cardSub" style={{ marginTop: 10, opacity: 0.8 }}>
              Tip: If you don’t see the email within 1–2 minutes, check Spam/Junk and try “Send verification code” again.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

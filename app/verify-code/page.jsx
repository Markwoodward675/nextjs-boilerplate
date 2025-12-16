"use client";

export const dynamic = "force-dynamic";

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

        if (b?.profile?.verificationCodeVerified) {
          router.replace("/dashboard");
          return;
        }

        setBoot(b);
      } catch (e) {
        // ✅ show error instead of instantly redirecting away
        setErr(getErrorMessage(e, "Session check failed. Please sign in again."));
        setBoot(null);
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
      setMsg("A new 6-digit code was generated. Check your Alerts.");
    } catch (e) {
      setErr(getErrorMessage(e, "Unable to generate code."));
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

  if (loading && !boot) return <div className="cardSub">Checking your session…</div>;

  // If bootstrap failed, allow user to go sign in again
  if (!boot?.user) {
    return (
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Verify your account</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              We couldn’t confirm your session. Please sign in again.
            </div>
          </div>

          {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}

          <div className="card" style={{ marginTop: 12 }}>
            <a className="btnPrimary" href="/signin" style={{ display: "inline-block", textAlign: "center" }}>
              Go to Sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contentCard">
      <div className="contentInner">
        <div className="card">
          <div className="cardTitle">Verify your account</div>
          <div className="cardSub" style={{ marginTop: 6 }}>
            Enter your 6-digit code to unlock your dashboard.
          </div>
          <div className="cardSub" style={{ marginTop: 10 }}>
            Signed in as <b>{boot.user.email}</b>.
          </div>
        </div>

        {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
        {msg ? <div className="flashOk" style={{ marginTop: 12 }}>{msg}</div> : null}

        <div className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <button className="btnPrimary" onClick={sendCode} disabled={loading}>
            {loading ? "Working…" : "Send / regenerate 6-digit code"}
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
              You’ll see the generated code inside your Alerts page.
            </div>
          </div>

          <button className="btnPrimary" onClick={verify} disabled={!canVerify || loading}>
            {loading ? "Verifying…" : "Verify code"}
          </button>

          <div className="cardSub">
            Not you?{" "}
            <button
              type="button"
              className="pillBtn"
              onClick={async () => {
                await signOut();
                router.replace("/signin");
              }}
              style={{ marginLeft: 6 }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

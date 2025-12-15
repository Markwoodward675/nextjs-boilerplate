"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, createOrRefreshVerifyCode, verify6DigitCode } from "../../lib/api";

export default function VerifyCodePage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const boot = await ensureUserBootstrap();
        if (cancel) return;
        setMe(boot.user);
        setProfile(boot.profile);

        if (boot.profile?.verificationCodeVerified) {
          router.replace("/dashboard");
        }
      } catch {
        router.replace("/signin");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const send = async () => {
    if (!me) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await createOrRefreshVerifyCode(me.$id);
      setOk("Verification code generated. Check Alerts.");
    } catch (e) {
      setErr(e?.message || "Unable to generate code.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!me) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await verify6DigitCode(me.$id, code);
      router.replace("/dashboard");
    } catch (e) {
      setErr(e?.message || "Unable to verify.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-bg">
      <div className="shell">
        <div className="contentCard">
          <div className="contentInner">
            <div className="card">
              <div className="cardTitle">Verify your account</div>
              <p className="cardSub">Enter the 6-digit code to access the dashboard.</p>
              {profile?.email ? <p className="cardSub" style={{ marginTop: 6 }}>Signed in as {profile.email}</p> : null}
            </div>

            {err ? <div className="flashError" style={{ marginTop: 12 }}>{err}</div> : null}
            {ok ? <div className="flashOk" style={{ marginTop: 12 }}>{ok}</div> : null}

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <button className="btnPrimary" onClick={send} disabled={busy}>
                {busy ? "Working…" : "Send / regenerate 6-digit code"}
              </button>

              <div>
                <div className="cardSub" style={{ marginBottom: 6 }}>Enter 6-digit code</div>
                <input
                  className="input"
                  maxLength={6}
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••"
                />
              </div>

              <button className="btnPrimary" onClick={verify} disabled={busy}>
                {busy ? "Verifying…" : "Verify code"}
              </button>

              <div className="cardSub">Email link verification is optional.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, getUserAlerts, createOrRefreshVerifyCode } from "../../../lib/api";

export default function AlertsPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = async (userId) => {
    const a = await getUserAlerts(userId);
    setAlerts(a);
  };

  useEffect(() => {
    let c = false;
    (async () => {
      const b = await ensureUserBootstrap().catch(() => null);
      if (!b) return router.replace("/signin");
      if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
      const a = await getUserAlerts(b.user.$id);
      if (!c) {
        setBoot(b);
        setAlerts(a);
      }
    })();
    return () => (c = true);
  }, [router]);

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Notifications</div>
        <div className="cardSub">Security, deposits, affiliate, and platform updates.</div>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {msg ? <div className="flashOk">{msg}</div> : null}

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="btnPrimary"
          onClick={async () => {
            setMsg("");
            setErr("");
            try {
              await createOrRefreshVerifyCode(boot.user.$id);
              setMsg("Verification code generated. See newest notification.");
              await load(boot.user.$id);
            } catch (e) {
              setErr(e?.message || "Unable to generate code.");
            }
          }}
        >
          Generate access code
        </button>
      </div>

      <div className="card">
        {alerts.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {alerts.map((a) => (
              <div key={a.$id} className="card">
                <div className="cardTitle" style={{ fontSize: 13 }}>{a.title}</div>
                <div className="cardSub" style={{ marginTop: 4 }}>{a.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cardSub">No notifications.</div>
        )}
      </div>
    </div>
  );
}

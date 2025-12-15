"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, createTransaction, createAlert } from "../../../lib/api";

const PLANS = [
  { key: "novice", label: "Novice", min: 250, max: 999 },
  { key: "standard", label: "Standard", min: 1000, max: 4999 },
  { key: "elite", label: "Elite", min: 5000, max: 9999 },
];

export default function InvestPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [plan, setPlan] = useState("novice");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const b = await ensureUserBootstrap().catch(() => null);
      if (!b) return router.replace("/signin");
      if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
      if (!c) setBoot(b);
    })();
    return () => (c = true);
  }, [router]);

  const p = useMemo(() => PLANS.find((x) => x.key === plan) || PLANS[0], [plan]);

  const submit = async () => {
    if (!boot) return;
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const amt = Number(amount);
      if (!amt || amt < p.min || amt > p.max) {
        throw new Error(`Amount must be between $${p.min} and $${p.max}.`);
      }

      await createTransaction(boot.user.$id, {
        type: "invest",
        amount: amt,
        status: "pending",
        meta: { plan: p.key, min: p.min, max: p.max },
      });

      await createAlert(boot.user.$id, {
        title: "Investment submitted",
        body: `Plan: ${p.label}. Amount: $${amt.toFixed(2)}.`,
        kind: "info",
      });

      setOk("Investment submitted.");
      setAmount("");
    } catch (e) {
      setErr(e?.message || "Unable to submit investment.");
    } finally {
      setBusy(false);
    }
  };

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Invest</div>
        <div className="cardSub">Select a plan and place an investment request.</div>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Plan</div>
          <select className="select" value={plan} onChange={(e) => setPlan(e.target.value)}>
            {PLANS.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label} (${x.min}–${x.max})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Amount (USD)</div>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`${p.min} - ${p.max}`} />
          <div className="cardSub" style={{ marginTop: 6 }}>Range locked: ${p.min}–${p.max}</div>
        </div>

        <button className="btnPrimary" onClick={submit} disabled={busy}>
          {busy ? "Submitting…" : "Submit investment"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, ENUM, errMsg, requireSession } from "../../../lib/appwriteClient";

const PLANS = [
  { key: "novice", label: "Novice", rate: 0.03 },
  { key: "standard", label: "Standard", rate: 0.05 },
  { key: "elite", label: "Elite", rate: 0.08 },
];

function pct(n) { return Math.max(0, Math.min(100, n)); }

export default function InvestPage() {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState("novice");
  const [amount, setAmount] = useState("");
  const [invests, setInvests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const selected = PLANS.find((p) => p.key === plan) || PLANS[0];
  const amt = Number(amount || 0);

  const dailyReturn = useMemo(() => (amt > 0 ? amt * selected.rate : 0), [amt, selected.rate]);

  const load = async (uid) => {
    const res = await db.listDocuments(DB_ID, COL.TX, [
      Query.equal("userId", uid),
      Query.equal("transactionType", ENUM.TX_TYPE_INVEST),
      Query.orderDesc("transactionDate"),
      Query.limit(50),
    ]);
    setInvests(res.documents || []);
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);
        await load(u.$id);
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load investments."));
      }
    })();
    return () => (dead = true);
  }, []);

  const startInvestment = async () => {
    if (!user?.$id) return;
    if (!(amt > 0)) return setErr("Enter a valid amount.");
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/invest/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          amount: amt,
          plan: selected.key,
          roiRate: selected.rate,
          durationDays: 30, // admin can adjust later
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Unable to start investment.");
      setMsg("Investment started.");
      setAmount("");
      await load(user.$id);
    } catch (e) {
      setErr(errMsg(e, "Unable to start investment."));
    } finally {
      setBusy(false);
    }
  };

  const claimRoi = async (txId) => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/invest/claim-roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.$id, investTxId: txId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Unable to claim ROI.");
      setMsg("ROI credited.");
      await load(user.$id);
    } catch (e) {
      setErr(errMsg(e, "Unable to claim ROI."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Invest</div>
        <div className="dt-subtle">Choose a plan and amount. ROI preview updates instantly. Progress tracks the session.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card">
          <div className="dt-h3">Start investment</div>

          <div className="dt-form" style={{ marginTop: 10 }}>
            <label className="dt-label">Plan</label>
            <select className="dt-input" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {PLANS.map((p) => (
                <option key={p.key} value={p.key}>{p.label} ({Math.round(p.rate * 100)}% / day)</option>
              ))}
            </select>

            <label className="dt-label">Amount (USD)</label>
            <input className="dt-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />

            <div className="dt-card dt-card-inner">
              <div className="dt-k">Daily ROI preview</div>
              <div className="dt-money">${dailyReturn.toLocaleString()}</div>
              <div className="dt-subtle">Based on your selected plan rate.</div>
            </div>

            <button className="dt-btn dt-btn-primary" disabled={busy} onClick={startInvestment}>
              {busy ? "Starting…" : "Start investment"}
            </button>
          </div>
        </div>

        <div className="dt-card">
          <div className="dt-h3">Active sessions</div>
          {(invests || []).length ? (
            <div className="dt-list" style={{ marginTop: 8 }}>
              {invests.map((t) => {
                const meta = safeJSON(t.meta);
                const durationDays = Number(meta.durationDays || 30);
                const start = new Date(t.transactionDate).getTime();
                const end = start + durationDays * 24 * 60 * 60 * 1000;
                const now = Date.now();
                const progress = pct(((now - start) / (end - start)) * 100);

                const canClaim = progress >= 100 && String(t.status || "").toLowerCase() !== "completed";

                return (
                  <div key={t.$id} className="dt-card dt-card-inner">
                    <div className="dt-row">
                      <div>
                        <div className="dt-row-title">{(meta.plan || "plan").toUpperCase()} • ${Number(t.amount || 0).toLocaleString()}</div>
                        <div className="dt-row-sub">Session progress: {progress.toFixed(0)}%</div>
                      </div>
                      <div className="dt-row-right">
                        <div className="dt-row-sub">{t.status || "active"}</div>
                      </div>
                    </div>

                    <div className="dt-progress">
                      <div className="dt-progress-bar" style={{ width: `${progress}%` }} />
                    </div>

                    {canClaim ? (
                      <button className="dt-btn dt-btn-primary" disabled={busy} onClick={() => claimRoi(t.$id)}>
                        {busy ? "Working…" : "Claim ROI"}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dt-subtle" style={{ marginTop: 8 }}>No active investments yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function safeJSON(s) {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}

"use client";

import { useState } from "react";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState("approved");
  const [walletDocId, setWalletDocId] = useState("");
  const [delta, setDelta] = useState("");
  const [msg, setMsg] = useState("");

  const call = async (url, body) => {
    setMsg("");
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": key,
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Request failed");
    return data;
  };

  return (
    <div className="page-bg">
      <div className="shell">
        <div className="contentCard">
          <div className="contentInner" style={{ display: "grid", gap: 12 }}>
            <div className="card">
              <div className="cardTitle">Admin Console</div>
              <div className="cardSub">Secure operations: KYC approvals, wallet adjustments, oversight.</div>
            </div>

            {msg ? <div className="flashOk">{msg}</div> : null}

            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div className="cardTitle" style={{ fontSize: 13 }}>Admin Key</div>
              <input className="input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="ADMIN_PANEL_KEY" />
            </div>

            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div className="cardTitle" style={{ fontSize: 13 }}>KYC Review</div>
              <input className="input" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID (Appwrite $id)" />
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="pending">pending</option>
              </select>
              <button
                className="btnPrimary"
                onClick={async () => {
                  const res = await call("/api/admin/approve-kyc", { userId, status });
                  setMsg(`KYC updated: ${res.updated.kycStatus}`);
                }}
              >
                Apply KYC Status
              </button>
            </div>

            <div className="card" style={{ display: "grid", gap: 10 }}>
              <div className="cardTitle" style={{ fontSize: 13 }}>Wallet Adjustment</div>
              <input className="input" value={walletDocId} onChange={(e) => setWalletDocId(e.target.value)} placeholder="Wallet document $id" />
              <input className="input" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Delta (e.g. 50 or -25)" />
              <button
                className="btnPrimary"
                onClick={async () => {
                  const res = await call("/api/admin/adjust-wallet", { walletDocId, delta: Number(delta), reason: "manual_adjustment" });
                  setMsg(`Wallet updated. New balance: ${res.updated.balance}`);
                }}
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

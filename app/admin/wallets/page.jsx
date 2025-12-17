"use client";

import { useEffect, useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminWallets() {
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [amt, setAmt] = useState("");
  const [walletId, setWalletId] = useState("");

  const load = async () => {
    setErr("");
    const data = await adminFetch(`/api/admin/wallets?userId=${encodeURIComponent(userId.trim())}`, { method: "GET" });
    setRows(data.wallets || []);
  };

  return (
    <AdminShell title="Wallets" subtitle="View and adjust wallet balances.">
      {err ? <div className="flashError">{err}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <input className="input" placeholder="Enter userId…" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <button className="btnPrimary" onClick={() => load().catch((e) => setErr(e.message || "Failed."))}>
          Load wallets
        </button>
      </div>

      <div className="card" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {rows.map((w) => (
          <div key={w.$id} className="card" style={{ padding: 12 }}>
            <div className="cardTitle" style={{ fontSize: 13 }}>
              {w.currencyType} · {w.walletId}
            </div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Balance: <b>{w.balance}</b> · Active: {String(w.isActive)}
            </div>
            <button
              className="pillBtn"
              style={{ marginTop: 10 }}
              onClick={() => setWalletId(w.walletId)}
            >
              Select for adjustment
            </button>
          </div>
        ))}

        {rows.length ? (
          <div className="card" style={{ padding: 12 }}>
            <div className="cardTitle" style={{ fontSize: 13 }}>Adjust balance</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Selected walletId: <b>{walletId || "None"}</b>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <input className="input" placeholder="Amount (e.g. 250)" value={amt} onChange={(e) => setAmt(e.target.value)} />
              <button
                className="btnPrimary"
                disabled={!walletId || !amt}
                onClick={async () => {
                  setErr("");
                  await adminFetch("/api/admin/adjust-wallet", {
                    method: "POST",
                    body: JSON.stringify({ userId: userId.trim(), walletId, amount: Number(amt) }),
                  });
                  setAmt("");
                  await load();
                }}
              >
                Apply adjustment
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

"use client";

import { useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminTransactions() {
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    const data = await adminFetch(`/api/admin/transactions?userId=${encodeURIComponent(userId.trim())}`, { method: "GET" });
    setRows(data.transactions || []);
  };

  return (
    <AdminShell title="Transactions" subtitle="Inspect a user’s transaction history.">
      {err ? <div className="flashError">{err}</div> : null}

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" placeholder="Enter userId…" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <button className="btnPrimary" onClick={() => load().catch((e) => setErr(e.message || "Failed."))}>Load</button>
      </div>

      <div className="card" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {rows.length ? rows.map((t) => (
          <div key={t.$id} className="card" style={{ padding: 12 }}>
            <div className="cardTitle" style={{ fontSize: 13 }}>
              {t.transactionType} · {t.amount} · {t.currencyType}
            </div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              status: {t.status || "—"} · {t.transactionDate || t.$createdAt}
            </div>
          </div>
        )) : <div className="cardSub">No transactions.</div>}
      </div>
    </AdminShell>
  );
}

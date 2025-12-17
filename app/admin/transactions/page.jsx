"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await adminFetch("/api/admin/transactions");
      setRows(data.transactions || []);
    } catch (e) {
      setErr(e.message || "Failed to load transactions.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((t) => {
      const uid = String(t.userId || "").toLowerCase();
      const wid = String(t.walletId || "").toLowerCase();
      const type = String(t.transactionType || "").toLowerCase();
      const cur = String(t.currencyType || "").toLowerCase();
      return uid.includes(s) || wid.includes(s) || type.includes(s) || cur.includes(s);
    });
  }, [rows, q]);

  return (
    <div className="dt-card">
      <div className="dt-card-title">Transactions</div>
      <div className="dt-card-sub">Latest transactions across the platform.</div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="dt-input"
          placeholder="Search userId / walletId / type / currency…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 520 }}
        />
        <button className="dt-btn" type="button" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((t) => (
          <div key={t.$id} className="dt-tile" style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="dt-tile-title">
                {t.transactionType} • {t.currencyType} {Number(t.amount || 0).toLocaleString()}
              </div>
              <div className="dt-kicker">{t.transactionDate || t.$createdAt || ""}</div>
            </div>
            <div className="dt-tile-sub">
              userId: {t.userId} • walletId: {t.walletId} • status: {t.status || "—"}
            </div>
          </div>
        ))}
        {!busy && !filtered.length ? <div className="dt-card-sub">No transactions found.</div> : null}
      </div>
    </div>
  );
}

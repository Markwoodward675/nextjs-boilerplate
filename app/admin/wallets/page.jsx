"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  const [adjWalletId, setAdjWalletId] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await adminFetch("/api/admin/wallets");
      setWallets(data.wallets || []);
    } catch (e) {
      setErr(e.message || "Failed to load wallets.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return wallets;
    return wallets.filter((w) => {
      const uid = String(w.userId || "").toLowerCase();
      const wid = String(w.walletId || w.$id || "").toLowerCase();
      const cur = String(w.currencyType || "").toLowerCase();
      return uid.includes(s) || wid.includes(s) || cur.includes(s);
    });
  }, [wallets, q]);

  const submitAdjust = async () => {
    setErr("");
    try {
      const amount = Number(adjAmount);
      if (!adjWalletId) throw new Error("Select a wallet to adjust.");
      if (!Number.isFinite(amount)) throw new Error("Enter a valid adjustment amount.");

      await adminFetch("/api/admin/wallets/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletId: adjWalletId,
          delta: amount,
          note: adjNote || "",
        }),
      });

      setAdjAmount("");
      setAdjNote("");
      await load();
    } catch (e) {
      setErr(e.message || "Adjustment failed.");
    }
  };

  return (
    <div className="dt-card">
      <div className="dt-card-title">Wallets</div>
      <div className="dt-card-sub">View wallets and apply admin adjustments.</div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="dt-input"
          placeholder="Search by userId / walletId / currency…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button className="dt-btn" type="button" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="dt-card" style={{ marginTop: 12 }}>
        <div className="dt-card-title">Admin Adjustment</div>
        <div className="dt-card-sub">Adds or subtracts from a wallet balance and creates a transaction + alert.</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, maxWidth: 520 }}>
          <select className="dt-input" value={adjWalletId} onChange={(e) => setAdjWalletId(e.target.value)}>
            <option value="">Select wallet…</option>
            {wallets.map((w) => (
              <option key={w.$id} value={w.$id}>
                {w.currencyType} • userId {w.userId} • balance {w.balance}
              </option>
            ))}
          </select>

          <input
            className="dt-input"
            placeholder="Adjustment delta (e.g. 50 or -25)"
            value={adjAmount}
            onChange={(e) => setAdjAmount(e.target.value)}
          />

          <input
            className="dt-input"
            placeholder="Note (optional)"
            value={adjNote}
            onChange={(e) => setAdjNote(e.target.value)}
          />

          <button className="dt-btn dt-btn-primary" type="button" onClick={submitAdjust}>
            Apply adjustment
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((w) => (
          <div key={w.$id} className="dt-tile" style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="dt-tile-title">
                {w.currencyType} Wallet <span className="dt-kicker">({w.walletId || w.$id})</span>
              </div>
              <div className="dt-kicker">userId: {w.userId}</div>
            </div>
            <div className="dt-tile-sub">Balance: <b>{Number(w.balance || 0).toLocaleString()}</b> • Active: {String(w.isActive)}</div>
          </div>
        ))}
        {!busy && !filtered.length ? <div className="dt-card-sub">No wallets found.</div> : null}
      </div>
    </div>
  );
}

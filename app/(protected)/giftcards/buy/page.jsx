"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, ENUM, errMsg, requireSession } from "../../../../lib/appwriteClient";

const VENDORS = ["Amazon","Razer Gold","Steam","iTunes","Google Play","PlayStation","Target","Xbox","Pokémon"];

export default function GiftcardsBuyPage() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [walletId, setWalletId] = useState("");
  const [vendor, setVendor] = useState("Amazon");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);
        const w = await db.listDocuments(DB_ID, COL.WALLETS, [Query.equal("userId", u.$id), Query.limit(50)]);
        setWallets(w.documents || []);
        setWalletId(w.documents?.[0]?.walletId || w.documents?.[0]?.$id || "");
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load giftcards buy."));
      }
    })();
    return () => (dead = true);
  }, []);

  const can = useMemo(() => Number(amount || 0) > 0 && walletId, [amount, walletId]);

  const submit = async () => {
    setBusy(true);
    setErr(""); setMsg("");
    try {
      const res = await fetch("/api/giftcard-trade-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          walletId,
          side: "buy",
          vendor,
          amount: Number(amount),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Request failed.");
      setMsg("Giftcard buy request submitted.");
      setAmount("");
    } catch (e) {
      setErr(errMsg(e, "Request failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Giftcards · Buy</div>
        <div className="dt-subtle">Select vendor and amount to place a buy request.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-form">
          <label className="dt-label">Wallet</label>
          <select className="dt-input" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            {(wallets || []).map((w) => (
              <option key={w.$id} value={w.walletId || w.$id}>
                {String(w.currencyType || "WALLET")} • ${Number(w.balance || 0).toLocaleString()}
              </option>
            ))}
          </select>

          <label className="dt-label">Vendor</label>
          <select className="dt-input" value={vendor} onChange={(e) => setVendor(e.target.value)}>
            {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <label className="dt-label">Amount (USD)</label>
          <input className="dt-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />

          <button className="dt-btn dt-btn-primary" disabled={!can || busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit buy request"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, createTransaction } from "../../../lib/api";

export default function TradePage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] = useState("buy");
  const [qty, setQty] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

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

  const place = async () => {
    if (!boot) return;
    setErr("");
    setOk("");
    try {
      const q = Number(qty);
      if (!q || q <= 0) throw new Error("Enter a valid quantity.");

      await createTransaction(boot.user.$id, {
        type: "trade",
        amount: 0,
        status: "pending",
        meta: { symbol, side, qty: q },
      });

      setOk("Order submitted.");
      setQty("");
    } catch (e) {
      setErr(e?.message || "Unable to place order.");
    }
  };

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Trade</div>
        <div className="cardSub">Order entry and execution tracking.</div>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Symbol</div>
          <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        </div>

        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Side</div>
          <select className="select" value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Quantity</div>
          <input className="input" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>

        <button className="btnPrimary" onClick={place}>Place order</button>
      </div>
    </div>
  );
}

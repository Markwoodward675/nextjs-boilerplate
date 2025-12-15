"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, createTransaction } from "../../../lib/api";

export default function DepositPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const b = await ensureUserBootstrap();
        if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
        if (!cancel) setBoot(b);
      } catch {
        router.replace("/signin");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const can = useMemo(() => Number(amount) > 0, [amount]);

  const createInvoice = async () => {
    if (!boot) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount.");

      // Order id includes userId for IPN mapping: DT-<userId>-<timestamp>
      const order_id = `DT-${boot.user.$id}-${Date.now()}`;

      const res = await fetch("/api/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: amt,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          order_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : "Invoice error");

      // record pending deposit transaction (will be confirmed by IPN later)
      await createTransaction(boot.user.$id, {
        type: "deposit",
        amount: amt,
        status: "pending",
        meta: { provider: "nowpayments", invoiceId: data.id, order_id },
      });

      // open invoice url
      const url = data.invoice_url || data.payment_url;
      if (!url) throw new Error("Missing invoice URL.");
      window.location.href = url;
    } catch (e) {
      setErr(e?.message || "Unable to create invoice.");
    } finally {
      setBusy(false);
    }
  };

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Deposit</div>
        <p className="cardSub">Create a crypto invoice via NOWPayments.</p>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Amount (USD)</div>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>

        <button className="btnPrimary" onClick={createInvoice} disabled={!can || busy}>
          {busy ? "Creating invoice…" : "Continue to payment"}
        </button>

        <div className="cardSub">Payment currency: USDT (TRC20)</div>
      </div>
    </div>
  );
}

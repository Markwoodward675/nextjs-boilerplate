"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, createTransaction } from "../../../../lib/api";

export default function GiftcardSellPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [vendor, setVendor] = useState("Amazon");
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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

  const submit = async () => {
    if (!boot) return;
    setErr("");
    setMsg("");
    try {
      const v = Number(value);
      if (!v || v <= 0) throw new Error("Enter a valid card value.");

      await createTransaction(boot.user.$id, {
        type: "giftcard_sell",
        amount: v,
        status: "pending",
        meta: { vendor },
      });

      setMsg("Request submitted.");
      setValue("");
    } catch (e) {
      setErr(e?.message || "Unable to submit.");
    }
  };

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Giftcards — Sell</div>
        <div className="cardSub">Submit your card for review.</div>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {msg ? <div className="flashOk">{msg}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Vendor</div>
          <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        </div>
        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Card value (USD)</div>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <button className="btnPrimary" onClick={submit}>Submit</button>
      </div>
    </div>
  );
}

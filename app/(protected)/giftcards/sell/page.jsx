"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, errMsg, requireSession } from "../../../../lib/appwriteClient";

const VENDORS = ["Amazon","Razer Gold","Steam","iTunes","Google Play","PlayStation","Target","Xbox","Pokémon"];

export default function GiftcardsSellPage() {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState("Amazon");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [cardPhoto, setCardPhoto] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (!dead) setUser(u);
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load giftcards sell."));
      }
    })();
    return () => (dead = true);
  }, []);

  const can = useMemo(() => Number(amount || 0) > 0 && pin.trim() && cardPhoto, [amount, pin, cardPhoto]);

  const submit = async () => {
    if (!user?.$id) return;
    setBusy(true);
    setErr(""); setMsg("");
    try {
      const fd = new FormData();
      fd.append("userId", user.$id);
      fd.append("side", "sell");
      fd.append("vendor", vendor);
      fd.append("amount", String(Number(amount)));
      fd.append("pin", pin.trim());
      fd.append("photo", cardPhoto);

      const res = await fetch("/api/giftcard-trade-submit", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Request failed.");
      setMsg("Giftcard sell request submitted.");
      setAmount(""); setPin(""); setCardPhoto(null);
    } catch (e) {
      setErr(errMsg(e, "Request failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Giftcards · Sell</div>
        <div className="dt-subtle">Select vendor, upload card photo, and provide PIN/CODE.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-form">
          <label className="dt-label">Vendor</label>
          <select className="dt-input" value={vendor} onChange={(e) => setVendor(e.target.value)}>
            {VENDORS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <label className="dt-label">Amount (USD)</label>
          <input className="dt-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />

          <label className="dt-label">PIN / CODE</label>
          <input className="dt-input" value={pin} onChange={(e) => setPin(e.target.value)} />

          <label className="dt-label">Upload card photo</label>
          <input className="dt-file" type="file" accept="image/*" onChange={(e) => setCardPhoto(e.target.files?.[0] || null)} />

          <button className="dt-btn dt-btn-primary" disabled={!can || busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit sell request"}
          </button>
        </div>
      </div>
    </div>
  );
}

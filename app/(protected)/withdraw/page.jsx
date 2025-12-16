"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, ENUM, errMsg, requireSession } from "../../../lib/appwriteClient";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Belgium","Brazil","Canada","China",
  "Denmark","Egypt","Finland","France","Germany","Ghana","India","Ireland","Italy","Japan","Kenya",
  "Mexico","Netherlands","Nigeria","Norway","Portugal","Qatar","Saudi Arabia","South Africa","Spain",
  "Sweden","Switzerland","United Arab Emirates","United Kingdom","United States",
];

const CRYPTO = ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP"];

export default function WithdrawPage() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");

  // bank fields
  const [country, setCountry] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // crypto fields
  const [asset, setAsset] = useState("BTC");
  const [address, setAddress] = useState("");

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
        if (!dead) {
          setWallets(w.documents || []);
          setWalletId(w.documents?.[0]?.walletId || w.documents?.[0]?.$id || "");
        }
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load withdrawals."));
      }
    })();
    return () => (dead = true);
  }, []);

  const can = useMemo(() => {
    if (!(Number(amount || 0) > 0) || !walletId) return false;
    if (method === "bank") return !!country && !!bankName && !!accountName && !!accountNumber;
    if (method === "crypto") return !!asset && !!address.trim();
    return false;
  }, [amount, walletId, method, country, bankName, accountName, accountNumber, asset, address]);

  const submit = async () => {
    if (!user?.$id) return setErr("Missing userId.");
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const payload =
        method === "bank"
          ? { country, bankName, accountName, accountNumber }
          : { asset, address: address.trim() };

      const res = await fetch("/api/withdraw-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          walletId,
          amount: Number(amount),
          currencyType: ENUM.CURRENCY_USD,
          method,
          details: payload,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Withdraw request failed.");
      setMsg("Withdrawal submitted. Awaiting confirmation.");
      setAmount("");
    } catch (e) {
      setErr(errMsg(e, "Withdraw request failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Withdraw</div>
        <div className="dt-subtle">Fields change depending on withdrawal method.</div>
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

          <label className="dt-label">Method</label>
          <select className="dt-input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank">Bank transfer</option>
            <option value="crypto">Crypto</option>
          </select>

          <label className="dt-label">Amount (USD)</label>
          <input className="dt-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />

          {method === "bank" ? (
            <>
              <label className="dt-label">Country</label>
              <select className="dt-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <label className="dt-label">Bank name</label>
              <input className="dt-input" value={bankName} onChange={(e) => setBankName(e.target.value)} />

              <label className="dt-label">Account name</label>
              <input className="dt-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} />

              <label className="dt-label">Account number</label>
              <input className="dt-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </>
          ) : (
            <>
              <label className="dt-label">Asset</label>
              <select className="dt-input" value={asset} onChange={(e) => setAsset(e.target.value)}>
                {CRYPTO.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>

              <label className="dt-label">Wallet address</label>
              <input className="dt-input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </>
          )}

          <button className="dt-btn dt-btn-primary" disabled={!can || busy} onClick={submit}>
            {busy ? "Submitting…" : "Submit withdrawal"}
          </button>
        </div>
      </div>
    </div>
  );
}

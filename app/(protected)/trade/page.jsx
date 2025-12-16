"use client";

import { useEffect, useMemo, useState } from "react";
import { errMsg, requireSession } from "../../../lib/appwriteClient";

const TICKERS = ["BTC", "ETH", "SOL", "XRP", "BNB", "USDT", "ADA", "DOGE"];
const CURRENCIES = ["USD", "EUR", "JPY", "GBP"];

function bybitUrl(symbol) {
  // Bybit uses formats like BTCUSDT
  const s = String(symbol || "BTC").toUpperCase();
  const pair = s.endsWith("USDT") ? s : `${s}USDT`;
  return `https://www.bybit.com/en/trade/spot/${pair}`;
}

export default function TradePage() {
  const [user, setUser] = useState(null);

  const [ticker, setTicker] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [currencyType, setCurrencyType] = useState("USD");
  const [platform, setPlatform] = useState("bybit");

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
        if (!dead) setErr(errMsg(e, "We couldn’t confirm your session. Please sign in again."));
      }
    })();
    return () => (dead = true);
  }, []);

  const amt = Number(amount || 0);

  const can = useMemo(() => {
    return !!user?.$id && !!ticker && amt > 0 && CURRENCIES.includes(currencyType);
  }, [user?.$id, ticker, amt, currencyType]);

  const submit = async () => {
    if (!can || busy) return;

    setBusy(true);
    setErr("");
    setMsg("");

    const redirectTo =
      platform === "bybit" ? bybitUrl(ticker) : bybitUrl(ticker); // future platforms can be added

    try {
      // Record intent in your system first (server route writes to Appwrite)
      const res = await fetch("/api/paper-order-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          amount: amt,
          currencyType, // must be USD/EUR/JPY/GBP
          transactionType: "trade",
          meta: {
            ticker,
            platform,
            redirectTo,
            note: "User initiated trade redirect",
          },
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        // Don’t block user from trading if the record write fails
        setErr(j?.error || "Trade record could not be saved, but you can proceed.");
      } else {
        setMsg("Redirecting to trading platform…");
      }
    } catch (e) {
      setErr(errMsg(e, "Trade record could not be saved, but you can proceed."));
    } finally {
      setBusy(false);
      window.location.href = redirectTo;
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Trade</div>
        <div className="dt-subtle">
          Select an asset and amount. You’ll be redirected to a trusted exchange to execute the trade.
        </div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-h3">Trade setup</div>

        <div className="dt-form" style={{ marginTop: 10 }}>
          <label className="dt-label">Platform</label>
          <select className="dt-input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="bybit">Bybit</option>
          </select>

          <label className="dt-label">Asset</label>
          <select className="dt-input" value={ticker} onChange={(e) => setTicker(e.target.value)}>
            {TICKERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="dt-label">Amount</label>
          <input
            className="dt-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 250"
          />

          <label className="dt-label">Account currency</label>
          <select className="dt-input" value={currencyType} onChange={(e) => setCurrencyType(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="dt-card dt-card-inner">
            <div className="dt-k">Redirect destination</div>
            <div className="dt-subtle" style={{ wordBreak: "break-word" }}>
              {bybitUrl(ticker)}
            </div>
          </div>

          <button className="dt-btn dt-btn-primary" disabled={!can || busy} onClick={submit}>
            {busy ? "Preparing…" : "Proceed to trade →"}
          </button>
        </div>
      </div>
    </div>
  );
}

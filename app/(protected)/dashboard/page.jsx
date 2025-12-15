"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, getUserTransactions, getUserAlerts } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [txs, setTxs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const b = await ensureUserBootstrap();
        if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");

        const [t, a] = await Promise.all([
          getUserTransactions(b.user.$id),
          getUserAlerts(b.user.$id),
        ]);

        if (!cancel) {
          setBoot(b);
          setTxs(t);
          setAlerts(a);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Dashboard unavailable.");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const totals = useMemo(() => {
    const map = { main: 0, trading: 0, affiliate: 0 };
    (boot?.wallets || []).forEach((w) => {
      if (w.currencyType === "main") map.main = Number(w.balance || 0);
      if (w.currencyType === "trading") map.trading = Number(w.balance || 0);
      if (w.currencyType === "affiliate") map.affiliate = Number(w.balance || 0);
    });
    return map;
  }, [boot?.wallets]);

  const recentTx = useMemo(() => (txs || []).slice(0, 10), [txs]);

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Overview</div>
        <p className="cardSub">Balances, activity, and alerts.</p>
      </div>

      {err ? <div className="flashError">{err}</div> : null}

      <div className="card">
        <div className="cardTitle">Balances</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="card">
            <div className="cardSub">Main</div>
            <div className="cardTitle">{money(totals.main)}</div>
          </div>
          <div className="card">
            <div className="cardSub">Trading</div>
            <div className="cardTitle">{money(totals.trading)}</div>
          </div>
          <div className="card">
            <div className="cardSub">Affiliate</div>
            <div className="cardTitle">{money(totals.affiliate)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardTitle">Recent transactions</div>
        {recentTx.length ? (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {recentTx.map((t) => (
              <div key={t.$id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div className="cardTitle" style={{ fontSize: 13 }}>{t.type || "Transaction"}</div>
                  <div className="cardSub">{new Date(t.createdAt || t.$createdAt).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="cardTitle" style={{ fontSize: 13 }}>{money(t.amount)}</div>
                  <div className="cardSub">{t.status || "pending"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="cardSub" style={{ marginTop: 8 }}>No transactions yet.</p>
        )}
      </div>

      <div className="card">
        <div className="cardTitle">Alerts</div>
        {alerts.length ? (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {alerts.slice(0, 6).map((a) => (
              <div key={a.$id} className="card">
                <div className="cardTitle" style={{ fontSize: 13 }}>{a.title}</div>
                <div className="cardSub">{a.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="cardSub" style={{ marginTop: 8 }}>No notifications.</p>
        )}
      </div>
    </div>
  );
}

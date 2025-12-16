"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Query } from "appwrite";
import { db, DB_ID, COL, ENUM, errMsg, requireSession } from "../../../lib/appwriteClient";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [tx, setTx] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  const load = async (uid) => {
    const [w, t, a] = await Promise.all([
      db.listDocuments(DB_ID, COL.WALLETS, [Query.equal("userId", uid), Query.limit(50)]),
      db.listDocuments(DB_ID, COL.TX, [Query.equal("userId", uid), Query.orderDesc("transactionDate"), Query.limit(25)]),
      db.listDocuments(DB_ID, COL.ALERTS, [Query.equal("userId", uid), Query.orderDesc("$createdAt"), Query.limit(10)]),
    ]);
    setWallets(w.documents || []);
    setTx(t.documents || []);
    setAlerts(a.documents || []);
  };

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);
        await load(u.$id);
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load dashboard."));
      }
    })();
    return () => (dead = true);
  }, []);

  const totals = useMemo(() => {
    const walletsTotal = (wallets || []).reduce((sum, w) => sum + Number(w.balance || 0), 0);

    const invested = (tx || [])
      .filter((x) => x.transactionType === ENUM.TX_TYPE_INVEST)
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const roiEarned = (tx || [])
      .filter((x) => x.transactionType === ENUM.TX_TYPE_ROI)
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const aff = (tx || [])
      .filter((x) => x.transactionType === ENUM.TX_TYPE_AFF)
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    // You requested: invest return balance minus invested + affiliate etc
    const investNet = roiEarned - invested;

    return {
      walletsTotal,
      invested,
      roiEarned,
      aff,
      investNet,
      total: walletsTotal + investNet + aff,
    };
  }, [wallets, tx]);

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Overview</div>
        <div className="dt-subtle">
          Total balance includes wallet balances + affiliate commissions + investment net (ROI − principal).
        </div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card">
          <div className="dt-k">Total Balance</div>
          <div className="dt-money">${totals.total.toLocaleString()}</div>
          <div className="dt-subtle">Wallets + Investment Net + Affiliate</div>
        </div>

        <div className="dt-card">
          <div className="dt-k">Investment Net</div>
          <div className="dt-money">${totals.investNet.toLocaleString()}</div>
          <div className="dt-subtle">ROI − Invested</div>
        </div>

        <div className="dt-card">
          <div className="dt-k">Affiliate Earned</div>
          <div className="dt-money">${totals.aff.toLocaleString()}</div>
          <div className="dt-subtle">Commission credits</div>
        </div>
      </div>

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card">
          <div className="dt-h3">Recent Transactions</div>
          {tx?.length ? (
            <div className="dt-list">
              {tx.slice(0, 8).map((t) => (
                <div key={t.$id} className="dt-row">
                  <div>
                    <div className="dt-row-title">{t.transactionType}</div>
                    <div className="dt-row-sub">{new Date(t.transactionDate).toLocaleString()}</div>
                  </div>
                  <div className="dt-row-right">
                    <div className="dt-row-amt">${Number(t.amount || 0).toLocaleString()}</div>
                    <div className="dt-row-sub">{t.status || "pending"}</div>
                  </div>
                </div>
              ))}
              <Link className="dt-link" href="/transactions">View all →</Link>
            </div>
          ) : (
            <div className="dt-subtle">No transactions yet.</div>
          )}
        </div>

        <div className="dt-card">
          <div className="dt-h3">Alerts</div>
          {alerts?.length ? (
            <div className="dt-list">
              {alerts.slice(0, 6).map((a) => (
                <div key={a.$id} className="dt-row">
                  <div>
                    <div className="dt-row-title">{a.alertTitle || a.title}</div>
                    <div className="dt-row-sub">{a.alertMessage || a.body}</div>
                  </div>
                </div>
              ))}
              <Link className="dt-link" href="/alerts">Open notifications →</Link>
            </div>
          ) : (
            <div className="dt-subtle">No notifications.</div>
          )}
        </div>
      </div>
    </div>
  );
}

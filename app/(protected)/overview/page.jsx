"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Query } from "appwrite";
import { db, DB_ID, COL, errMsg, requireSession } from "../../../lib/appwriteClient";

export default function OverviewPage() {
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [tx, setTx] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);

        const [w, t, a] = await Promise.all([
          db.listDocuments(DB_ID, COL.WALLETS, [Query.equal("userId", u.$id), Query.limit(50)]),
          db.listDocuments(DB_ID, COL.TX, [Query.equal("userId", u.$id), Query.orderDesc("transactionDate"), Query.limit(12)]),
          db.listDocuments(DB_ID, COL.ALERTS, [Query.equal("userId", u.$id), Query.orderDesc("$createdAt"), Query.limit(8)]),
        ]);

        if (!dead) {
          setWallets(w.documents || []);
          setTx(t.documents || []);
          setAlerts(a.documents || []);
        }
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load overview."));
      }
    })();
    return () => (dead = true);
  }, []);

  const totals = useMemo(() => {
    const walletsTotal = (wallets || []).reduce((s, w) => s + Number(w.balance || 0), 0);

    const commissions = (tx || [])
      .filter((x) => x.transactionType === "commission")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    const adminAdjust = (tx || [])
      .filter((x) => x.transactionType === "admin_adjustment")
      .reduce((s, x) => s + Number(x.amount || 0), 0);

    return {
      walletsTotal,
      commissions,
      adminAdjust,
      total: walletsTotal + commissions + adminAdjust,
    };
  }, [wallets, tx]);

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Overview</div>
        <div className="dt-subtle">Fast view of balances, activity, and notifications.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card">
          <div className="dt-k">Total Balance</div>
          <div className="dt-money">${totals.total.toLocaleString()}</div>
          <div className="dt-subtle">Wallets + commission + admin adjustments</div>
        </div>

        <div className="dt-card">
          <div className="dt-k">Wallets</div>
          <div className="dt-money">${totals.walletsTotal.toLocaleString()}</div>
          <div className="dt-subtle">{wallets?.length || 0} active wallets</div>
        </div>

        <div className="dt-card">
          <div className="dt-k">Commission</div>
          <div className="dt-money">${totals.commissions.toLocaleString()}</div>
          <div className="dt-subtle">Affiliate earnings</div>
        </div>
      </div>

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card">
          <div className="dt-h3">Quick actions</div>
          <div className="dt-action-grid" style={{ marginTop: 10 }}>
            <Link className="dt-action-card dt-action-primary" href="/deposit">
              <div>
                <div className="dt-action-title">Deposit</div>
                <div className="dt-action-sub">Fund your account</div>
              </div>
              <div className="dt-action-arrow">→</div>
            </Link>

            <Link className="dt-action-card" href="/withdraw">
              <div>
                <div className="dt-action-title">Withdraw</div>
                <div className="dt-action-sub">Request payout</div>
              </div>
              <div className="dt-action-arrow">→</div>
            </Link>

            <Link className="dt-action-card dt-action-muted" href="/trade">
              <div>
                <div className="dt-action-title">Trade</div>
                <div className="dt-action-sub">Execute on exchange</div>
              </div>
              <div className="dt-action-arrow">→</div>
            </Link>
          </div>
        </div>

        <div className="dt-card">
          <div className="dt-h3">Latest activity</div>
          {tx?.length ? (
            <div className="dt-list" style={{ marginTop: 8 }}>
              {tx.map((t) => (
                <div key={t.$id} className="dt-row">
                  <div>
                    <div className="dt-row-title">
                      {t.transactionType} • {t.currencyType} • ${Number(t.amount || 0).toLocaleString()}
                    </div>
                    <div className="dt-row-sub">{new Date(t.transactionDate).toLocaleString()} • {t.status || "—"}</div>
                  </div>
                </div>
              ))}
              <Link className="dt-link" href="/transactions">View all →</Link>
            </div>
          ) : (
            <div className="dt-subtle" style={{ marginTop: 8 }}>No activity yet.</div>
          )}
        </div>
      </div>

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-h3">Notifications</div>
        {alerts?.length ? (
          <div className="dt-list" style={{ marginTop: 8 }}>
            {alerts.map((a) => (
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
          <div className="dt-subtle" style={{ marginTop: 8 }}>No notifications.</div>
        )}
      </div>
    </div>
  );
}

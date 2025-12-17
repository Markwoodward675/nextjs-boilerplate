"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "./_lib/adminFetch";

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then(setStats)
      .catch((e) => setErr(e.message || "Failed to load."));
  }, []);

  return (
    <div className="dt-shell" style={{ padding: 16 }}>
      <div className="dt-card">
        <div className="dt-card-title">Admin Dashboard</div>
        <div className="dt-card-sub">Users, wallets, KYC, alerts, transactions.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err">{err}</div> : null}

      <div className="dt-grid" style={{ marginTop: 12 }}>
        <Link className="dt-tile" href="/admin/users">Users</Link>
        <Link className="dt-tile" href="/admin/kyc">KYC</Link>
        <Link className="dt-tile" href="/admin/wallets">Wallets</Link>
        <Link className="dt-tile" href="/admin/transactions">Transactions</Link>
        <Link className="dt-tile" href="/admin/alerts">Alerts</Link>
        <Link className="dt-tile" href="/admin/logs">Logs Tail</Link>
      </div>

      <div className="dt-card" style={{ marginTop: 12 }}>
        <div className="dt-card-title">Quick Stats</div>
        <pre className="dt-pre">
          {stats ? JSON.stringify(stats, null, 2) : "Loading…"}
        </pre>
      </div>
    </div>
  );
}

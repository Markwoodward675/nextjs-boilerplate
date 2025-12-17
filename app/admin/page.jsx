"use client";

import { useEffect, useState } from "react";
import AdminShell from "./_components/AdminShell";
import { adminFetch } from "./_components/adminFetch";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const s = await adminFetch("/api/admin/stats", { method: "GET" });
        if (!c) setStats(s);
      } catch (e) {
        if (!c) setErr(e.message || "Failed to load admin stats.");
      }
    })();
    return () => (c = true);
  }, []);

  return (
    <AdminShell title="Admin Overview" subtitle="System stats and latest activity.">
      {err ? <div className="flashError">{err}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="cardTitle" style={{ fontSize: 13 }}>Quick stats</div>
        <div className="cardSub">
          {stats ? (
            <>
              Users: <b>{stats.users}</b> · Profiles: <b>{stats.profiles}</b> · Wallets: <b>{stats.wallets}</b> ·
              Transactions: <b>{stats.transactions}</b> · Alerts: <b>{stats.alerts}</b>
            </>
          ) : (
            "Loading…"
          )}
        </div>
      </div>
    </AdminShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";

export default function AdminLogsPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const d = await adminFetch("/api/admin/logs-tail");
      setData(d);
    } catch (e) {
      setErr(e.message || "Failed to load logs.");
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="dt-card">
      <div className="dt-card-title">Logs Tail</div>
      <div className="dt-card-sub">Recent system activity (server-side aggregation).</div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="dt-btn dt-btn-primary" type="button" onClick={load}>Refresh</button>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <pre className="dt-pre" style={{ marginTop: 12 }}>
        {data ? JSON.stringify(data, null, 2) : "Loading…"}
      </pre>
    </div>
  );
}

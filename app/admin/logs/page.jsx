"use client";

import { useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminLogs() {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    const data = await adminFetch("/api/admin/logs-tail", { method: "GET" });
    setText(data?.text || "");
  };

  return (
    <AdminShell title="Logs" subtitle="Tail recent server events.">
      {err ? <div className="flashError">{err}</div> : null}

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btnPrimary" onClick={() => load().catch((e) => setErr(e.message || "Failed"))}>
          Refresh logs
        </button>
      </div>

      <pre className="card" style={{ marginTop: 12, padding: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
        {text || "No logs yet."}
      </pre>
    </AdminShell>
  );
}

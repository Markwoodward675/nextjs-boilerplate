"use client";

import { useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminAlerts() {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("low");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const send = async () => {
    setErr("");
    setOk("");
    const data = await adminFetch("/api/admin/notify", {
      method: "POST",
      body: JSON.stringify({ userId: userId.trim(), title, body, severity }),
    });
    setOk(data?.message || "Alert sent.");
    setTitle("");
    setBody("");
  };

  return (
    <AdminShell title="Alerts" subtitle="Send notifications to users.">
      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <input className="input" placeholder="UserId" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={4} placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />

        <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>

        <button className="btnPrimary" onClick={() => send().catch((e) => setErr(e.message || "Failed"))}>
          Send alert
        </button>
      </div>
    </AdminShell>
  );
}

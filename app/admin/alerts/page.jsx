"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";

export default function AdminAlertsPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("low");

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await adminFetch("/api/admin/alerts");
      setRows(data.alerts || []);
    } catch (e) {
      setErr(e.message || "Failed to load alerts.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((a) => {
      const uid = String(a.userId || "").toLowerCase();
      const tt = String(a.title || a.alertTitle || "").toLowerCase();
      const msg = String(a.body || a.alertMessage || "").toLowerCase();
      return uid.includes(s) || tt.includes(s) || msg.includes(s);
    });
  }, [rows, q]);

  const createAlert = async () => {
    setErr("");
    try {
      if (!userId.trim()) throw new Error("userId is required.");
      if (!title.trim()) throw new Error("Title is required.");
      if (!body.trim()) throw new Error("Message is required.");

      await adminFetch("/api/admin/alerts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim(),
          title: title.trim(),
          body: body.trim(),
          severity,
        }),
      });

      setTitle("");
      setBody("");
      await load();
    } catch (e) {
      setErr(e.message || "Failed to create alert.");
    }
  };

  return (
    <div className="dt-card">
      <div className="dt-card-title">Alerts</div>
      <div className="dt-card-sub">Send alerts to users and review recent notifications.</div>

      <div className="dt-card" style={{ marginTop: 12 }}>
        <div className="dt-card-title">Create Alert</div>
        <div className="dt-card-sub">Sends a notification to a specific userId.</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, maxWidth: 620 }}>
          <input className="dt-input" placeholder="userId" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <input className="dt-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="dt-input" placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />

          <select className="dt-input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>

          <button className="dt-btn dt-btn-primary" type="button" onClick={createAlert}>
            Send alert
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="dt-input"
          placeholder="Search alerts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 520 }}
        />
        <button className="dt-btn" type="button" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((a) => (
          <div key={a.$id} className="dt-tile" style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="dt-tile-title">{a.title || a.alertTitle}</div>
              <div className="dt-kicker">{a.severity || "low"}</div>
            </div>
            <div className="dt-tile-sub">{a.body || a.alertMessage}</div>
            <div className="dt-kicker">userId: {a.userId} • {a.$createdAt || ""}</div>
          </div>
        ))}
        {!busy && !filtered.length ? <div className="dt-card-sub">No alerts found.</div> : null}
      </div>
    </div>
  );
}

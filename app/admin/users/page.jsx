"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const data = await adminFetch("/api/admin/users");
        if (!c) setRows(data.users || []);
      } catch (e) {
        if (!c) setErr(e.message || "Failed to load users.");
      } finally {
        if (!c) setBusy(false);
      }
    })();
    return () => (c = true);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((u) => {
      const email = String(u.email || "").toLowerCase();
      const name = String(u.name || "").toLowerCase();
      const id = String(u.$id || "").toLowerCase();
      return email.includes(s) || name.includes(s) || id.includes(s);
    });
  }, [rows, q]);

  return (
    <div className="dt-card">
      <div className="dt-card-title">Users</div>
      <div className="dt-card-sub">Appwrite users list (admin view).</div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="dt-input"
          placeholder="Search by email / name / userId…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button
          className="dt-btn"
          type="button"
          onClick={() => window.location.reload()}
          disabled={busy}
        >
          Refresh
        </button>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {busy ? <div className="dt-card-sub" style={{ marginTop: 12 }}>Loading…</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((u) => (
          <div key={u.$id} className="dt-tile" style={{ display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="dt-tile-title">{u.email || "—"}</div>
              <div className="dt-kicker">ID: {u.$id}</div>
            </div>
            <div className="dt-tile-sub">Name: {u.name || "—"} • Status: {u.status || "—"}</div>
          </div>
        ))}
        {!busy && !filtered.length ? <div className="dt-card-sub">No users found.</div> : null}
      </div>
    </div>
  );
}

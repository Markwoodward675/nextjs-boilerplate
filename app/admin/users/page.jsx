"use client";

import { useEffect, useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    const data = await adminFetch(`/api/admin/users?q=${encodeURIComponent(q || "")}`, { method: "GET" });
    setRows(data.users || []);
  };

  useEffect(() => {
    load().catch((e) => setErr(e.message || "Failed to load users."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminShell title="Users" subtitle="Search users and view basic account info.">
      {err ? <div className="flashError">{err}</div> : null}

      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" placeholder="Search email / name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btnPrimary" onClick={load}>Search</button>
      </div>

      <div className="card" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {rows.length ? rows.map((u) => (
          <div key={u.$id} className="card" style={{ padding: 12 }}>
            <div className="cardTitle" style={{ fontSize: 13 }}>{u.name || "User"}</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              {u.email} · ID: <span style={{ opacity: 0.75 }}>{u.$id}</span>
            </div>
          </div>
        )) : (
          <div className="cardSub">No users found.</div>
        )}
      </div>
    </AdminShell>
  );
}

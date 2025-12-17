"use client";

import { useEffect, useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminKyc() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    const data = await adminFetch("/api/admin/kyc", { method: "GET" });
    setRows(data.items || []);
  };

  useEffect(() => {
    load().catch((e) => setErr(e.message || "Failed to load KYC list."));
  }, []);

  return (
    <AdminShell title="KYC Requests" subtitle="Approve or reject identity verification.">
      {err ? <div className="flashError">{err}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <button className="btnPrimary" onClick={load}>Refresh</button>

        {rows.length ? rows.map((p) => (
          <div key={p.$id} className="card" style={{ padding: 12 }}>
            <div className="cardTitle" style={{ fontSize: 13 }}>{p.fullName || p.email}</div>
            <div className="cardSub" style={{ marginTop: 6 }}>
              userId: {p.userId} · kycStatus: <b>{p.kycStatus || "unverified"}</b>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button
                className="pillBtn"
                onClick={async () => {
                  await adminFetch("/api/admin/approve-kyc", {
                    method: "POST",
                    body: JSON.stringify({ userId: p.userId, approve: true }),
                  });
                  load();
                }}
              >
                Approve
              </button>

              <button
                className="pillBtn"
                onClick={async () => {
                  await adminFetch("/api/admin/approve-kyc", {
                    method: "POST",
                    body: JSON.stringify({ userId: p.userId, approve: false }),
                  });
                  load();
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )) : <div className="cardSub">No KYC requests found.</div>}
      </div>
    </AdminShell>
  );
}

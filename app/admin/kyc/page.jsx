"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";

export default function AdminKycPage() {
  const [profiles, setProfiles] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await adminFetch("/api/admin/kyc");
      setProfiles(data.profiles || []);
    } catch (e) {
      setErr(e.message || "Failed to load KYC queue.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter((p) => {
      const email = String(p.email || "").toLowerCase();
      const userId = String(p.userId || "").toLowerCase();
      const name = String(p.fullName || "").toLowerCase();
      return email.includes(s) || userId.includes(s) || name.includes(s);
    });
  }, [profiles, q]);

  const setStatus = async (userId, status) => {
    setErr("");
    try {
      await adminFetch("/api/admin/kyc/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      await load();
    } catch (e) {
      setErr(e.message || "Failed to update KYC status.");
    }
  };

  return (
    <div className="dt-card">
      <div className="dt-card-title">KYC Review</div>
      <div className="dt-card-sub">Approve / reject profile KYC status.</div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="dt-input"
          placeholder="Search by email / userId / name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button className="dt-btn" type="button" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((p) => {
          const status = String(p.kycStatus || "not_submitted");
          return (
            <div key={p.$id} className="dt-tile" style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div className="dt-tile-title">{p.fullName || "—"} <span className="dt-kicker">({p.email || "—"})</span></div>
                <div className="dt-kicker">userId: {p.userId || "—"}</div>
              </div>

              <div className="dt-tile-sub">
                KYC Status: <b>{status}</b> • Country: {p.country || "—"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="dt-btn dt-btn-primary" type="button" onClick={() => setStatus(p.userId, "approved")}>
                  Approve
                </button>
                <button className="dt-btn" type="button" onClick={() => setStatus(p.userId, "rejected")}>
                  Reject
                </button>
                <button className="dt-btn" type="button" onClick={() => setStatus(p.userId, "pending")}>
                  Set Pending
                </button>
              </div>
            </div>
          );
        })}
        {!busy && !filtered.length ? <div className="dt-card-sub">No profiles found.</div> : null}
      </div>
    </div>
  );
}

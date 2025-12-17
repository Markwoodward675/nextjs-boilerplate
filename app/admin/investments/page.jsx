"use client";

import { useState } from "react";
import AdminShell from "../_components/AdminShell";
import { adminFetch } from "../_components/adminFetch";

export default function AdminInvestments() {
  const [userId, setUserId] = useState("");
  const [progress, setProgress] = useState("0");
  const [roi, setRoi] = useState("0");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const apply = async () => {
    setErr("");
    setOk("");
    const data = await adminFetch("/api/admin/investment-adjust", {
      method: "POST",
      body: JSON.stringify({
        userId: userId.trim(),
        progress: Number(progress),
        roiCredit: Number(roi),
      }),
    });
    setOk(data?.message || "Updated investment controls.");
  };

  return (
    <AdminShell title="Investments" subtitle="Adjust ROI/progress controls for users.">
      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <input className="input" placeholder="UserId" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input className="input" placeholder="Progress % (0 - 100)" value={progress} onChange={(e) => setProgress(e.target.value)} />
        <input className="input" placeholder="ROI credit amount" value={roi} onChange={(e) => setRoi(e.target.value)} />

        <button className="btnPrimary" onClick={() => apply().catch((e) => setErr(e.message || "Failed"))}>
          Apply changes
        </button>
      </div>
    </AdminShell>
  );
}

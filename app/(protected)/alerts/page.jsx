"use client";

import { useEffect, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, errMsg, requireSession } from "../../../lib/appwriteClient";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        const a = await db.listDocuments(DB_ID, COL.ALERTS, [
          Query.equal("userId", u.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100),
        ]);
        if (!dead) setAlerts(a.documents || []);
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load notifications."));
      }
    })();
    return () => (dead = true);
  }, []);

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Notifications</div>
        <div className="dt-subtle">Admin messages, transactions, investment progress, and platform updates.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}

      <div className="dt-card" style={{ marginTop: 14 }}>
        {alerts.length ? (
          <div className="dt-list">
            {alerts.map((a) => (
              <div key={a.$id} className="dt-row">
                <div>
                  <div className="dt-row-title">{a.alertTitle || a.title}</div>
                  <div className="dt-row-sub">{a.alertMessage || a.body}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dt-subtle">No notifications.</div>
        )}
      </div>
    </div>
  );
}

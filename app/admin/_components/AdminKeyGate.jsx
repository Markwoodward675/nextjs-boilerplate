"use client";

import { useEffect, useState } from "react";
import { clearAdminKey, getAdminKey, setAdminKey } from "./adminFetch";

export default function AdminKeyGate({ children }) {
  const [key, setKey] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setKey(getAdminKey());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!key) {
    return (
      <div className="dt-shell" style={{ paddingTop: 28 }}>
        <div className="contentCard">
          <div className="contentInner">
            <div className="card">
              <div className="cardTitle">Admin Panel</div>
              <div className="cardSub" style={{ marginTop: 6 }}>
                Enter your Admin Key to unlock the admin console.
              </div>
            </div>

            <div className="card" style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input
                className="input"
                placeholder="Paste ADMIN_ROUTE_KEY"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <button
                className="btnPrimary"
                onClick={() => {
                  const v = key.trim();
                  if (!v) return;
                  setAdminKey(v);
                  window.location.reload();
                }}
              >
                Unlock Admin
              </button>

              <div className="cardSub">
                Tip: Set <b>ADMIN_ROUTE_KEY</b> in Vercel Environment Variables.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

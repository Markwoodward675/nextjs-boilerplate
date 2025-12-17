"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearAdminKey } from "./adminFetch";

const nav = [
  ["Overview", "/admin"],
  ["Users", "/admin/users"],
  ["KYC", "/admin/kyc"],
  ["Wallets", "/admin/wallets"],
  ["Transactions", "/admin/transactions"],
  ["Alerts", "/admin/alerts"],
  ["Investments", "/admin/investments"],
  ["Logs", "/admin/logs"],
];

export default function AdminShell({ title, subtitle, children }) {
  const path = usePathname();

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 28 }}>
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="cardTitle">{title || "Admin Panel"}</div>
          <div className="cardSub" style={{ marginTop: 6 }}>{subtitle || "Manage users, KYC, wallets, alerts and ROI."}</div>
        </div>

        <button
          className="pillBtn"
          type="button"
          onClick={() => {
            clearAdminKey();
            window.location.reload();
          }}
        >
          Lock admin
        </button>
      </div>

      <div className="card" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {nav.map(([label, href]) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className="pillBtn"
              style={{
                borderColor: active ? "rgba(250,204,21,.55)" : undefined,
                background: active ? "rgba(250,204,21,.10)" : undefined,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

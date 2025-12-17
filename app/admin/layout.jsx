"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "./_lib/AdminGuard";
import { adminFetch } from "./_lib/adminFetch";

export default function AdminLayout({ children }) {
  const router = useRouter();

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("dt_admin_jwt");
      router.replace("/admin/login");
    }
  };

  return (
    <AdminGuard>
      <div className="dt-shell" style={{ padding: 16 }}>
        <div className="dt-card" style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="dt-card-title">Admin Panel</div>
            <div className="dt-card-sub">Users • Wallets • KYC • Transactions • Alerts</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="dt-chip" href="/admin/users">Users</Link>
            <Link className="dt-chip" href="/admin/kyc">KYC</Link>
            <Link className="dt-chip" href="/admin/wallets">Wallets</Link>
            <Link className="dt-chip" href="/admin/transactions">Transactions</Link>
            <Link className="dt-chip" href="/admin/alerts">Alerts</Link>
            <Link className="dt-chip" href="/admin/logs">Logs</Link>

            <button className="dt-chip dt-chip-primary" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </AdminGuard>
  );
}

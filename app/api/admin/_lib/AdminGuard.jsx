"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "./adminFetch";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setChecking(true);
      try {
        await adminFetch("/api/admin/me");
        if (!cancelled) setOk(true);
      } catch {
        if (!cancelled) {
          const next = encodeURIComponent(pathname || "/admin");
          router.replace(`/admin/login?next=${next}`);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="dt-shell" style={{ padding: 16 }}>
        <div className="dt-card">
          <div className="dt-card-title">Admin</div>
          <div className="dt-card-sub">Checking access…</div>
        </div>
      </div>
    );
  }

  if (!ok) return null;
  return children;
}

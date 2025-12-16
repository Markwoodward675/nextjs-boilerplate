// app/root-chrome.jsx
"use client";

import { usePathname } from "next/navigation";
import BrandLogo from "../components/BrandLogo";

function isProtectedPath(pathname) {
  // your protected pages live under /(protected) but in URL they are normal paths like /dashboard, /wallet, etc.
  // hide auth header for these:
  const protectedPrefixes = [
    "/dashboard",
    "/wallet",
    "/trade",
    "/invest",
    "/deposit",
    "/withdraw",
    "/transactions",
    "/affiliate",
    "/giftcards",
    "/alerts",
    "/settings",
    "/admin",
  ];
  return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function RootChrome({ children }) {
  const pathname = usePathname() || "/";

  const hideAuthHeader = isProtectedPath(pathname);

  return (
    <>
      {!hideAuthHeader ? (
        <header className="dt-header">
          <div className="dt-shell dt-header-inner">
            <div className="dt-brand">
              <div className="dt-brand-mark" aria-hidden>
                <BrandLogo size={28} />
              </div>
              <div className="dt-brand-text">
                <div className="dt-brand-title">Day Trader</div>
                <div className="dt-brand-sub">Markets • Wallets • Execution</div>
              </div>
            </div>

            <nav className="dt-top-actions">
              <a className="dt-chip" href="/signin">
                Sign in
              </a>
              <a className="dt-chip dt-chip-primary" href="/signup">
                Create account
              </a>
            </nav>
          </div>
        </header>
      ) : null}

      <main className="dt-main">{children}</main>
    </>
  );
}

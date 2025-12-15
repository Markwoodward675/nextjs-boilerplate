"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppShellPro({ children, rightSlot = null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/wallet", label: "Wallets" },
      { href: "/trade", label: "Trade" },
      { href: "/invest", label: "Invest" },
      { href: "/deposit", label: "Deposit" },
      { href: "/withdraw", label: "Withdraw" },
      { href: "/transactions", label: "Transactions" },
      { href: "/affiliate", label: "Affiliate" },
      { href: "/giftcards/buy", label: "Giftcards: Buy" },
      { href: "/giftcards/sell", label: "Giftcards: Sell" },
      { href: "/alerts", label: "Alerts" },
      { href: "/settings", label: "Settings" },
    ],
    []
  );

  const isActive = (href) => {
    if (!pathname) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="dt-shell">
      {/* Global responsive helpers to prevent dual rightSlot showing */}
      <style jsx global>{`
        .dt-hide-desktop { display: none; }
        .dt-hide-mobile { display: flex; }

        @media (max-width: 860px) {
          .dt-hide-desktop { display: flex; }
          .dt-hide-mobile { display: none; }
        }

        .dt-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.55);
          z-index: 40;
        }
        .dt-drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: min(360px, 92vw);
          background: rgba(10,10,12,.98);
          border-left: 1px solid rgba(255,255,255,.08);
          z-index: 50;
          padding: 14px;
          display: grid;
          grid-template-rows: auto 1fr;
          gap: 12px;
        }
        .dt-nav-title {
          font-weight: 700;
          letter-spacing: .3px;
        }
        .dt-nav {
          display: grid;
          gap: 8px;
        }
        .dt-nav a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.08);
          color: rgba(255,255,255,.88);
          text-decoration: none;
        }
        .dt-nav a:hover {
          border-color: rgba(56,189,248,.35);
        }
        .dt-nav a.dt-active {
          border-color: rgba(56,189,248,.55);
          background: rgba(56,189,248,.08);
        }
      `}</style>

      {/* Top header */}
      <header className="topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Mobile hamburger */}
          <button
            className="pillBtn dt-hide-desktop"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            type="button"
          >
            ☰
          </button>

          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontWeight: 800 }}>DT</div>
            <div className="cardSub" style={{ marginTop: 2 }}>
              Day Trader
              <span style={{ opacity: 0.65 }}> • Markets • Wallets • Execution</span>
            </div>
          </div>
        </div>

        {/* Desktop-only right slot (prevents showing twice) */}
        <div className="dt-hide-mobile" style={{ alignItems: "center", gap: 10 }}>
          {rightSlot}
        </div>
      </header>

      {/* Desktop sidebar */}
      <div className="appGrid" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14 }}>
        <aside className="sidebar dt-hide-mobile" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div className="card">
            <div className="cardTitle" style={{ fontSize: 14 }}>Navigation</div>
            <div className="cardSub" style={{ marginTop: 4 }}>Quick links</div>
          </div>

          <nav className="dt-nav">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? "dt-active" : ""}
              >
                <span>{item.label}</span>
                <span style={{ opacity: 0.55 }}>›</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ minWidth: 0 }}>{children}</main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <div className="dt-backdrop" onClick={() => setMobileOpen(false)} />
          <div className="dt-drawer">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div className="dt-nav-title">Navigation</div>
              <button className="pillBtn" onClick={() => setMobileOpen(false)} type="button">
                ✕
              </button>
            </div>

            {/* Mobile-only right slot INSIDE drawer (won’t show with desktop rightSlot) */}
            <div className="dt-hide-desktop" style={{ display: "grid", gap: 10 }}>
              {rightSlot}
            </div>

            <nav className="dt-nav" style={{ marginTop: 8 }}>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item.href) ? "dt-active" : ""}
                  onClick={() => setMobileOpen(false)}
                >
                  <span>{item.label}</span>
                  <span style={{ opacity: 0.55 }}>›</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/wallet", label: "Wallets", icon: "💳" },
  { href: "/trade", label: "Trade", icon: "📈" },
  { href: "/invest", label: "Invest", icon: "🧾" },
  { href: "/deposit", label: "Deposit", icon: "➕" },
  { href: "/withdraw", label: "Withdraw", icon: "➖" },
  { href: "/transactions", label: "Transactions", icon: "📜" },
  { href: "/affiliate", label: "Affiliate", icon: "🤝" },
  { href: "/giftcards/buy", label: "Giftcards: Buy", icon: "🛒" },
  { href: "/giftcards/sell", label: "Giftcards: Sell", icon: "🏷️" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function AppShellPro({
  children,
  rightSlot,
  subtitle = "Markets • Wallets • Execution",
  logoSrc = "/assets/img/my_logo.png",
}) {
  const path = usePathname();

  return (
    <div className="page-bg">
      <div className="shell">
        <header className="header">
          <div className="brand">
            <div className="brandLogo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="Day Trader" />
            </div>
            <div>
              <div className="brandMain">DAY TRADER</div>
              <div className="brandSub">{subtitle}</div>
            </div>
          </div>

          <div className="headerRight">
            {rightSlot}
          </div>
        </header>

        <div className="mainGrid">
          <aside className="navCard">
            <div className="navInner">
              <div className="navTitle">Navigation</div>
              <div className="navList">
                {NAV.map((n) => {
                  const active = path === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`navLink ${active ? "navLinkActive" : ""}`}
                    >
                      <span className="navIcon">{n.icon}</span>
                      <span>{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="contentCard">
            <div className="contentInner">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

const NAV = [
  { href: "/overview", label: "Overview" },
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
];

export default function AppShellPro({ children, rightSlot = null }) {
  return (
    <div className="dt-shell" style={{ paddingTop: 18 }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div className="cardTitle">Day Trader</div>
          <div className="cardSub">Markets • Wallets • Execution</div>
        </div>

        {/* HARD RULE: no avatar / placeholder unless rightSlot exists */}
        {rightSlot ? <div>{rightSlot}</div> : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, marginTop: 14 }}>
        <aside className="card" style={{ padding: 12 }}>
          <div className="cardSub" style={{ marginBottom: 10, opacity: 0.85 }}>Navigation</div>
          <div style={{ display: "grid", gap: 8 }}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="pillBtn" style={{ justifyContent: "flex-start" }}>
                {n.label}
              </Link>
            ))}
          </div>
        </aside>

        <section>{children}</section>
      </div>
    </div>
  );
}

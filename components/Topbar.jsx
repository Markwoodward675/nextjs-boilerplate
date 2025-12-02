"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/wallet", label: "Wallets" },
  { href: "/trade", label: "Trade" },
  { href: "/invest", label: "Invest" },
  { href: "/deposit", label: "Deposit" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/transactions", label: "Transactions" },
  { href: "/affiliate", label: "Affiliate" },
  { href: "/giftcards/buy", label: "Gift Cards" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" }
];

export default function Topbar() {
  const pathname = usePathname();

  const titleMap = {
    "/": "Welcome",
    "/dashboard": "Overview",
    "/wallet": "Wallets",
    "/trade": "Trading",
    "/invest": "Investments",
    "/affiliate": "Affiliate Center",
    "/giftcards/buy": "Buy Gift Cards",
    "/giftcards/sell": "Sell Gift Cards",
    "/deposit": "Deposit",
    "/withdraw": "Withdraw",
    "/transactions": "Transactions",
    "/alerts": "Alerts",
    "/settings": "Settings"
  };

  const title =
    titleMap[pathname] ||
    (pathname?.startsWith("/auth") ? "Account" : "Dashboard");

  return (
    <header className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-slate-50">
            {title}
          </h2>
          <p className="text-xs md:text-sm text-slate-400">
            Trading · Investments · Wallets · Affiliate
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <Link
            href="/auth/login"
            className="rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-900 hidden sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-full bg-blue-600 px-3 py-1 text-slate-50 hover:bg-blue-500 hidden sm:inline-flex"
          >
            Create account
          </Link>
        </div>
      </div>

      {/* Section navigation tabs */}
      <nav className="mt-4 flex gap-2 overflow-x-auto text-xs pb-1 md:pb-0">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 border transition ${
                active
                  ? "border-blue-500 bg-blue-600/20 text-blue-200"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

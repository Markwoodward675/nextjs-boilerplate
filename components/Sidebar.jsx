"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/wallet", label: "Wallets" },
  { href: "/trade", label: "Trade" },
  { href: "/invest", label: "Invest" },
  { href: "/affiliate", label: "Affiliate" },
  { href: "/giftcards/buy", label: "Buy Gift Cards" },
  { href: "/giftcards/sell", label: "Sell Gift Cards" },
  { href: "/deposit", label: "Deposit" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/transactions", label: "Transactions" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-72 bg-gradient-to-b from-black via-slate-950 to-slate-900 border-r border-slate-800 p-5 text-slate-100">
      <div className="flex flex-col w-full">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Day Trader
          </div>
          <h1 className="mt-1 text-xl font-bold text-blue-400">
            Trading Platform
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Tools for trading, investments, wallets, and affiliate earnings.
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {mainNav.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-blue-600/80 text-white"
                    : "text-slate-300 hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500">
          <Link
            href="/auth/login"
            className="block hover:text-slate-200 mb-1"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="block hover:text-slate-200 mb-1"
          >
            Create account
          </Link>
          <p className="mt-1 text-[10px] text-slate-600">
            Day Trader provides tools and data. We don&apos;t execute trades,
            hold client funds, or give personalized investment advice.
          </p>
        </div>
      </div>
    </aside>
  );
}

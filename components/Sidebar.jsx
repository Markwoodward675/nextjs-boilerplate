"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-72 bg-slate-950 border-r border-slate-800/80 px-5 py-6">
      <div className="flex flex-col w-full">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-[13px] font-bold text-slate-950">
              DT
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Day Trader
              </div>
              <div className="text-sm font-semibold text-slate-100">
                Trading Platform
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Manage trading wallets, allocations, and affiliate earnings in one
            professional dashboard.
          </p>
        </div>

        <nav className="flex-1 space-y-1 text-sm">
          {mainNav.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
          <p>
            Day Trader provides tools and analytics. Live trade execution and
            custody are always handled by your own broker or exchange.
          </p>
        </div>
      </div>
    </aside>
  );
}

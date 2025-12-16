// components/AppShellPro.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const navItems = [
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
];

export default function AppShellPro({ children, rightSlot = null }) {
  const [open, setOpen] = useState(false);

  const hasRightSlot = useMemo(() => {
    // Only render right area if something real is passed in.
    // null / undefined / false / "" -> treated as absent
    return Boolean(rightSlot);
  }, [rightSlot]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-yellow-500/25 bg-black/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="h-9 w-9 rounded-xl border border-yellow-500/60 bg-black/50 flex items-center justify-center overflow-hidden">
              {/* NOTE: No onError handlers here (build-safe) */}
              <img src="/icon.png" alt="Day Trader" className="h-7 w-7" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-yellow-400">Day Trader</div>
              <div className="text-[11px] text-slate-400">
                Markets • Wallets • Execution
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
            {navItems.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-full text-sm text-slate-200/85 hover:text-yellow-300 hover:bg-yellow-500/10 transition"
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              className="px-3 py-2 rounded-full text-sm text-slate-200/85 hover:text-yellow-300 hover:bg-yellow-500/10 transition"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="dt-more-nav"
            >
              More
            </button>
          </nav>

          {/* Right area — ONLY renders when rightSlot exists */}
          {hasRightSlot ? (
            <div className="flex items-center justify-end min-w-[180px]">
              {rightSlot}
            </div>
          ) : (
            // Keep spacing but render nothing visible (prevents layout jump)
            <div className="min-w-[180px]" />
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden px-3 py-2 rounded-full border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 transition"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="dt-mobile-nav"
          >
            Menu
          </button>
        </div>

        {/* Dropdown (Desktop “More”) */}
        {open ? (
          <div
            id="dt-more-nav"
            className="hidden md:block border-t border-yellow-500/15 bg-black/90"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2">
              {navItems.slice(6).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-full text-sm text-slate-200/85 hover:text-yellow-300 hover:bg-yellow-500/10 transition"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Mobile nav */}
        {open ? (
          <div
            id="dt-mobile-nav"
            className="md:hidden border-t border-yellow-500/15 bg-black/90"
          >
            <div className="px-4 py-3 grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-2 rounded-xl text-sm text-slate-200/85 hover:text-yellow-300 hover:bg-yellow-500/10 transition"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </header>

      {/* Page content */}
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}

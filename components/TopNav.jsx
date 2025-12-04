// components/TopNav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/wallet", label: "Wallet" },
  { href: "/trade", label: "Trade" },
  { href: "/invest", label: "Invest" },
  { href: "/affiliate", label: "Affiliate" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-2xl bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center text-xs font-semibold text-emerald-300">
            DT
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Day Trader
            </p>
            <p className="text-sm font-semibold text-slate-100">
              Educational Platform
            </p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-4 text-xs">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "rounded-full px-3 py-1.5 transition " +
                  (active
                    ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/60"
                    : "text-slate-300 hover:text-emerald-200 hover:bg-slate-800/80 border border-transparent")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {/* You can add a small user badge or email here if you want */}
          <SignOutButton />
        </div>
      </div>
    </header>
    <SignOutButton />   // or <SignOutButton variant="link" />
  );
}

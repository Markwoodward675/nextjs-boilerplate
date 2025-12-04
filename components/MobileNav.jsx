// components/MobileNav.jsx
"use client";

import { useState } from "react";
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

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      {/* Top bar with burger */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-2xl bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center text-xs font-semibold text-emerald-300">
              DT
            </div>
            <div className="leading-tight">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Day Trader
              </p>
              <p className="text-sm font-semibold text-slate-100">Dashboard</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Slide-down menu */}
      {open && (
        <nav className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <ul className="mx-auto max-w-6xl flex flex-col px-4 py-2 gap-1 text-sm">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className={
                      "block rounded-xl px-3 py-2 transition " +
                      (active
                        ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/60"
                        : "text-slate-200 hover:text-emerald-200 hover:bg-slate-800/80 border border-transparent")
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}

            {/* Sign out & switch account action */}
            <li className="mt-2 pb-2 border-t border-slate-800 pt-2">
              <SignOutButton variant="link" />
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

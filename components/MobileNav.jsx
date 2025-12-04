// components/MobileNav.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton"; // adjust path if your file lives elsewhere

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/wallet", label: "Wallet" },
  { href: "/trade", label: "Trade" },
  { href: "/invest", label: "Invest" },
  { href: "/deposit", label: "Deposit" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/transactions", label: "Transactions" },
  { href: "/affiliate", label: "Affiliate" },
  { href: "/giftcards/buy", label: "Giftcards" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  return (
    <nav className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold">
            DT
          </span>
          <span className="text-sm font-semibold text-slate-50">
            Day Trader
          </span>
        </Link>

        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center justify-center rounded-md border border-slate-700 px-2 py-1 text-slate-100 text-xs"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <ul className="space-y-1 border-t border-slate-800 bg-slate-950 px-4 py-3">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-slate-800 text-emerald-300"
                      : "text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}

          <li className="pt-2 border-t border-slate-800 mt-2">
            <SignOutButton variant="link" />
          </li>
        </ul>
      )}
    </nav>
  );
}

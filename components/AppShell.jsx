"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../lib/api";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Wallets", href: "/wallet" },
  { label: "Trade", href: "/trade" },
  { label: "Invest", href: "/invest" },
  { label: "Deposit", href: "/deposit" },
  { label: "Withdraw", href: "/withdraw" },
  { label: "Transactions", href: "/transactions" },
  { label: "Affiliate", href: "/affiliate" },
  { label: "Giftcards: Buy", href: "/giftcards/buy" },
  { label: "Giftcards: Sell", href: "/giftcards/sell" },
  { label: "Alerts", href: "/alerts" },
  { label: "Settings", href: "/settings" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!cancelled) setMe(u);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onLogout = async () => {
    try {
      await logoutUser();
    } finally {
      router.replace("/signin");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center font-semibold text-amber-200">
              DT
            </div>
            <div>
              <div className="text-sm font-semibold leading-4">Day Trader</div>
              <div className="text-[11px] text-slate-400">
                Educational wallets • Trading simulations
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <button
              onClick={() => setOpen((v) => !v)}
              className="md:hidden rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900 transition"
              type="button"
            >
              Menu
            </button>

            <div className="hidden md:flex items-center gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
                {me?.email || "Signed out"}
              </div>
              <button
                onClick={onLogout}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15 transition"
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside
            className={[
              "rounded-2xl border border-slate-800 bg-slate-900/40 p-3",
              "md:block",
              open ? "block" : "hidden md:block",
            ].join(" ")}
          >
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500">Quick nav</div>
              <div className="text-sm font-semibold">Your tools</div>
            </div>

            <nav className="grid gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={[
                      "rounded-xl px-3 py-2 text-sm transition border",
                      active
                        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                        : "text-slate-200 hover:bg-slate-800/50 border-transparent",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile logout */}
            <div className="mt-4 md:hidden">
              <button
                onClick={onLogout}
                className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/15 transition"
                type="button"
              >
                Logout
              </button>
              <div className="mt-2 text-xs text-slate-500">{me?.email || ""}</div>
            </div>
          </aside>

          {/* Main content */}
          <main className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      <footer className="border-t border-slate-800 bg-slate-950/60">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500">
          Day Trader is an educational simulation platform — not a broker.
        </div>
      </footer>
    </div>
  );
}

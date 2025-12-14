"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
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

export default function AppShellPro({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center">
              <span className="text-amber-200 font-semibold">DT</span>
            </div>
            <div>
              <div className="text-sm font-semibold leading-4">Day Trader</div>
              <div className="text-[11px] text-slate-500">Terminal • Simulations • Analytics</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/signout"
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/70 transition"
            >
              Sign out
            </Link>
          </div>
        </div>
      </div>

      {/* layout */}
      <div className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* sidebar */}
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/30 p-3 h-fit lg:sticky lg:top-[76px]">
          <div className="px-2 pb-2 text-[11px] uppercase tracking-widest text-slate-500">
            Navigation
          </div>

          <nav className="space-y-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-xl px-3 py-2 text-sm border transition",
                    active
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-100"
                      : "border-transparent hover:border-slate-800 hover:bg-slate-900/40 text-slate-200",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-xs text-slate-400">
              Educational simulation environment. No real trading or brokerage services.
            </div>
          </div>
        </aside>

        {/* main */}
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}

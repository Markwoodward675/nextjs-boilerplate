"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Wallets", "/wallet"],
  ["Trade", "/trade"],
  ["Invest", "/invest"],
  ["Deposit", "/deposit"],
  ["Withdraw", "/withdraw"],
  ["Transactions", "/transactions"],
  ["Affiliate", "/affiliate"],
  ["Giftcards: Buy", "/giftcards/buy"],
  ["Giftcards: Sell", "/giftcards/sell"],
  ["Alerts", "/alerts"],
  ["Settings", "/settings"],
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-lg font-semibold">DT • Day Trader</div>
          <div className="text-xs text-slate-400">
            Educational wallets • Simulations • Affiliate insights
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="grid gap-1">
              {nav.map(([label, href]) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                        : "text-slate-200 hover:bg-slate-800/60 border border-transparent",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </aside>

          <main className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

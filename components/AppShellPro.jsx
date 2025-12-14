"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NavItem = ({ href, label, icon }) => {
  const path = usePathname();
  const active = path === href;

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "border border-amber-500/25 bg-amber-500/10 text-amber-200"
          : "border border-transparent text-slate-300 hover:bg-slate-900/50 hover:text-slate-100",
      ].join(" ")}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/30">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
};

export default function AppShellPro({ children, rightSlot }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex max-w-7xl gap-4 p-4">
        {/* Sidebar */}
        <aside className="hidden w-[260px] shrink-0 md:block">
          <div className="sticky top-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
            <div className="flex items-center justify-between gap-3 px-2 pb-3">
              <div>
                <div className="text-xs tracking-widest text-amber-200">DT</div>
                <div className="text-sm font-semibold text-slate-100">Day Trader</div>
              </div>
              {rightSlot}
            </div>

            <div className="space-y-1">
              <NavItem href="/dashboard" label="Dashboard" icon="🏠" />
              <NavItem href="/wallet" label="Wallet" icon="💳" />
              <NavItem href="/trade" label="Trade" icon="📈" />
              <NavItem href="/invest" label="Invest" icon="🧾" />
              <NavItem href="/deposit" label="Deposit" icon="➕" />
              <NavItem href="/withdraw" label="Withdraw" icon="➖" />
              <NavItem href="/transactions" label="Transactions" icon="🧷" />
              <NavItem href="/affiliate" label="Affiliate" icon="🤝" />
              <NavItem href="/giftcards/buy" label="Giftcards • Buy" icon="🛒" />
              <NavItem href="/giftcards/sell" label="Giftcards • Sell" icon="🏷️" />
              <NavItem href="/alerts" label="Alerts" icon="🔔" />
              <NavItem href="/settings" label="Settings" icon="⚙️" />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {/* Top bar (mobile + right slot) */}
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/30 p-3 md:hidden">
            <div>
              <div className="text-xs tracking-widest text-amber-200">DT</div>
              <div className="text-sm font-semibold text-slate-100">Day Trader</div>
            </div>
            {rightSlot}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-60 border-r border-slate-800 bg-slate-950/80 backdrop-blur h-screen sticky top-0">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-100">
          Day Trader
        </div>
        <div className="text-[11px] text-slate-500">
          Trading · Investments · Wallets · Affiliate
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 text-xs space-y-1">
        <Link
          href="/dashboard"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Dashboard
        </Link>
        <Link
          href="/wallet"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Wallets
        </Link>
        <Link
          href="/trade"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Trade
        </Link>
        <Link
          href="/invest"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Invest
        </Link>
        <Link
          href="/giftcards/buy"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Gift cards
        </Link>
        <Link
          href="/affiliate"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Affiliate
        </Link>
        <Link
          href="/alerts"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Alerts
        </Link>
        <Link
          href="/settings"
          className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900/70"
        >
          Settings
        </Link>
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const pathname = usePathname();

  const titleMap = {
    "/": "Welcome",
    "/dashboard": "Overview",
    "/wallet": "Wallets",
    "/trade": "Trading",
    "/invest": "Investments",
    "/affiliate": "Affiliate",
    "/giftcards/buy": "Buy Gift Cards",
    "/giftcards/sell": "Sell Gift Cards",
    "/deposit": "Deposit",
    "/withdraw": "Withdraw",
    "/transactions": "Transactions",
    "/alerts": "Alerts",
    "/settings": "Settings"
  };

  const title =
    titleMap[pathname] ||
    (pathname?.startsWith("/auth") ? "Account" : "Dashboard");

  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-50">
          {title}
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Trading · Investments · Wallets · Affiliate
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Link
          href="/auth/login"
          className="rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-800"
        >
          Log in
        </Link>
        <Link
          href="/auth/register"
          className="rounded-full bg-blue-600 px-3 py-1 text-slate-50 hover:bg-blue-500"
        >
          Create account
        </Link>
      </div>
    </header>
  );
}

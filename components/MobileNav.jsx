"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "../components/SignOutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/wallet", label: "Wallet" },
  { href: "/trade", label: "Trade" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" }
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden px-3 py-2 text-[11px]">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center flex-1 text-center ${
              active
                ? "text-blue-400"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            <span
              className={`h-1 w-7 rounded-full mb-1 ${
                active ? "bg-blue-500" : "bg-slate-800"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
    <li>
  <SignOutButton variant="link" />
</li>
  );
}

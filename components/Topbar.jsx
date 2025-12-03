"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { account } from "../lib/appwrite";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/wallet", label: "Wallets" },
  { href: "/trade", label: "Trade" },
  { href: "/invest", label: "Invest" },
  { href: "/deposit", label: "Deposit" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/transactions", label: "Transactions" },
  { href: "/affiliate", label: "Affiliate" },
  { href: "/giftcards/buy", label: "Gift Cards" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" }
];

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const u = await account.get();
        if (!cancelled) {
          setUser(u);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) setCheckingUser(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.error(err);
    } finally {
      router.push("/auth/login");
    }
  }

  const titleMap = {
    "/": "Welcome",
    "/dashboard": "Overview",
    "/wallet": "Wallets",
    "/trade": "Trading",
    "/invest": "Investments",
    "/affiliate": "Affiliate Center",
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
    <>
      <header className="mb-5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: title + subtitle */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-slate-50">
              {title}
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              Trading · Investments · Wallets · Affiliate
            </p>
          </div>

          {/* Right: desktop buttons + mobile menu */}
          <div className="flex items-center gap-2">
            {/* Desktop auth buttons */}
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-900"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-full bg-slate-800 px-3 py-1 text-slate-50 hover:bg-slate-700"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-900"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="rounded-full bg-blue-600 px-3 py-1 text-slate-50 hover:bg-blue-500"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="sm:hidden inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-700 hover:bg-slate-900"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <span className="block w-4 h-[1px] bg-slate-200 mb-1" />
              <span className="block w-4 h-[1px] bg-slate-200 mb-1" />
              <span className="block w-4 h-[1px] bg-slate-200" />
            </button>
          </div>
        </div>

        {/* Section navigation tabs (desktop + scrollable mobile) */}
        <nav className="mt-4 flex gap-2 overflow-x-auto text-xs pb-1 md:pb-0">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href || pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 border transition ${
                  active
                    ? "border-blue-500 bg-blue-600/20 text-blue-200"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile slide-out nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 sm:hidden">
          <div className="absolute inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="inline-flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-[13px] font-bold text-slate-950">
                  DT
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Day Trader
                  </div>
                  <div className="text-xs font-semibold text-slate-100">
                    Trading Platform
                  </div>
                </div>
              </div>
              <button
                className="h-8 w-8 rounded-full border border-slate-700 flex items-center justify-center text-xs text-slate-200"
                onClick={() => setMobileNavOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 text-sm">
              {tabs.map((tab) => {
                const active =
                  pathname === tab.href || pathname?.startsWith(tab.href);
                return (
                  <button
                    key={tab.href}
                    onClick={() => {
                      router.push(tab.href);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full text-left rounded-lg px-3 py-2 mb-1 transition-colors ${
                      active
                        ? "bg-slate-800 text-slate-50"
                        : "text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
              {checkingUser ? (
                <p>Checking session…</p>
              ) : user ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500">
                    Signed in as{" "}
                    <span className="font-medium text-slate-200">
                      {user.name || user.email}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        router.push("/dashboard");
                        setMobileNavOpen(false);
                      }}
                      className="flex-1 rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-900"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={async () => {
                        await handleLogout();
                        setMobileNavOpen(false);
                      }}
                      className="flex-1 rounded-full bg-slate-100 text-slate-900 px-3 py-1 font-medium hover:bg-white"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      router.push("/auth/login");
                      setMobileNavOpen(false);
                    }}
                    className="flex-1 rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-900"
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => {
                      router.push("/auth/register");
                      setMobileNavOpen(false);
                    }}
                    className="flex-1 rounded-full bg-blue-600 px-3 py-1 text-slate-50 hover:bg-blue-500"
                  >
                    Create account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

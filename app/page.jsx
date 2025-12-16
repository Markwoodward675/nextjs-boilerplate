// app/page.jsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[70vh] flex items-center">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Left: text */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.26em] text-emerald-400">
            Day Trader Platform
          </span>

          <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-50">
            Structure your trading, capital, and affiliate revenue in one place.
          </h1>

          <p className="mt-3 text-sm md:text-base text-slate-300 max-w-xl">
            Day Trader brings together trading wallets, investment allocations,
            risk controls, and affiliate earnings. Designed for serious traders
            who want a clear view of exposure and cashflow across venues.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            {/* ✅ FIX: send to /signup (your real route) */}
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Create account
            </Link>

            {/* ✅ FIX: if user isn't signed in, /dashboard will redirect to /signin anyway via your protected layout */}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900"
            >
              View dashboard
            </Link>
          </div>

          <p className="mt-4 text-[11px] text-slate-500 max-w-xl">
            Day Trader provides tools, analytics, and capital organization.
            Order routing, custody, and regulation remain with your own brokers,
            exchanges, and custodians.
          </p>
        </div>

        {/* Right: pseudo chart + patterns */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)] chart-grid">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Multi-market view
                </p>
                <p className="text-xs text-slate-300">
                  BTC · ETH · Stablecoins · Index
                </p>
              </div>
              <div className="text-[10px] text-emerald-400 pattern-chip px-3 py-1 rounded-full border border-emerald-500/40 bg-slate-900/80">
                <span className="relative z-10">Risk-controlled mode</span>
              </div>
            </div>

            <div className="h-24 mb-4 relative">
              <svg viewBox="0 0 200 80" className="w-full h-full text-sky-400/80">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  points="0,60 30,40 50,30 70,45 95,20 120,45 140,30 165,45 190,35"
                />
              </svg>
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            </div>

            <div className="flex items-end gap-[3px] h-16 mb-4">
              {[8, 22, 16, 30, 22, 38, 18, 26, 32, 14, 28, 20].map((h, idx) => (
                <div key={idx} className="flex-1 flex items-end justify-center">
                  <div
                    className="w-[6px] rounded-full bg-gradient-to-t from-slate-800 via-sky-500/70 to-emerald-400/80"
                    style={{ height: `${h}px` }}
                  />
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              Combine directional setups, multi-timeframe context, and strict
              risk limits. Turn your trading into a repeatable process instead
              of random decisions.
            </p>
            <p className="text-xs text-slate-500 mt-2">Build: 2025-12-16</p>
          </div>
        </div>
      </div>
    </main>
  );
}

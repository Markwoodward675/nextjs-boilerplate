// app/page.jsx
import Link from "next/link";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";
const ICON_SRC = "/icon.png"; // put your icon in /public/icon.png (or change path)

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-black bg-cover bg-center px-4"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-5xl bg-black/80 border border-yellow-500/80 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur">
          {/* Header (same as auth pages) */}
          <div className="flex items-center justify-center gap-3">
            <img
              src={ICON_SRC}
              alt="Day Trader"
              className="h-11 w-11 rounded-xl border border-yellow-500/50 bg-black/60 p-1"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-yellow-400 leading-tight">
                Day Trader
              </div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-yellow-200/80">
                Markets • Wallets • Execution
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Left: copy */}
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-emerald-300/90">
                Trading platform interface
              </div>

              <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-50">
                Structure your trading, capital, and affiliate revenue in one place.
              </h1>

              <p className="mt-3 text-sm md:text-base text-slate-300 max-w-xl">
                Consolidate wallets, performance tracking, investment allocations,
                and affiliate earnings into a single dashboard—built for clarity,
                discipline, and repeatable execution.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                {/* ✅ FIX: correct route */}
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-yellow-500 px-7 py-3 text-sm font-extrabold text-black hover:bg-yellow-400 transition"
                >
                  Create account
                </Link>

                <Link
                  href="/signin"
                  className="inline-flex items-center justify-center rounded-full border border-yellow-500/60 px-7 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-500/10 transition"
                >
                  Sign in
                </Link>
              </div>

              <p className="mt-4 text-[12px] text-slate-400 max-w-xl">
                This platform provides tools and analytics only. Order execution,
                custody, and regulation remain with your own brokers, exchanges,
                and custodians.
              </p>
            </div>

            {/* Right: chart card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Multi-market view
                    </p>
                    <p className="text-xs text-slate-300">
                      BTC · ETH · Stablecoins · Index
                    </p>
                  </div>
                  <div className="text-[10px] text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/40 bg-slate-900/80">
                    <span className="relative z-10">Risk-controlled mode</span>
                  </div>
                </div>

                {/* stylized line */}
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

                {/* volume bars */}
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
                  Build repeatable execution: directional bias, multi-timeframe context,
                  and strict risk limits—so decisions stay systematic under pressure.
                </p>
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div className="mt-7 text-center text-[11px] text-slate-500">
            Secure sign-in • Email verification • Private dashboard access
          </div>
        </div>
      </main>
    </div>
  );
}

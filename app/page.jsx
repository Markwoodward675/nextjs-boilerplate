// app/page.jsx
import Link from "next/link";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-black bg-cover bg-center"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      {/* Dark overlay for contrast */}
      <div className="min-h-screen bg-black/70">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-yellow-500/20 bg-black/70 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border border-yellow-500/50 bg-black/60 p-1 flex items-center justify-center">
                {/* Build-safe: no event handlers */}
                <img src="/icon.png" alt="Day Trader" className="h-7 w-7" />
              </div>
              <div className="leading-tight">
                <div className="text-base font-semibold text-yellow-400">
                  Day Trader
                </div>
                <div className="text-[11px] text-slate-400">
                  Markets • Wallets • Execution
                </div>
              </div>
            </Link>

            {/* Right actions */}
            <nav className="flex items-center gap-2">
              <Link
                href="/signin"
                className="px-4 py-2 rounded-full border border-yellow-500/40 text-sm font-medium text-slate-200 hover:bg-yellow-500/10 hover:border-yellow-500/60 transition"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-full bg-yellow-500 text-sm font-extrabold text-black hover:bg-yellow-400 transition"
              >
                Create account
              </Link>
            </nav>
          </div>
        </header>

        {/* Body */}
        <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div className="bg-black/70 border border-yellow-500/20 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Dashboard · Wallets · Verification
              </div>

              <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-100">
                Control your trading structure, capital flow, and affiliate revenue.
              </h1>

              <p className="mt-3 text-sm md:text-base text-slate-300">
                Day Trader helps you organize balances, track simulated activity,
                and maintain a clear view of performance. Built for disciplined
                execution and clean reporting.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-yellow-500 px-6 py-3 text-sm font-extrabold text-black hover:bg-yellow-400 transition"
                >
                  Create account
                </Link>

                <Link
                  href="/signin"
                  className="inline-flex items-center justify-center rounded-full border border-yellow-500/40 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-yellow-500/10 hover:border-yellow-500/60 transition"
                >
                  Sign in
                </Link>
              </div>

              <div className="mt-5 text-[12px] text-slate-400 leading-relaxed">
                <span className="text-slate-300 font-medium">Note:</span>{" "}
                This is an educational/simulation platform — not a broker.
                Trading execution and custody remain with your own providers.
              </div>
            </div>

            {/* Right */}
            <div className="bg-black/70 border border-yellow-500/20 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Multi-market overview
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    BTC · ETH · Stablecoins · Index
                  </div>
                </div>

                <div className="text-[10px] text-yellow-200 px-3 py-1 rounded-full border border-yellow-500/30 bg-black/50">
                  Risk-controlled mode
                </div>
              </div>

              {/* Chart line */}
              <div className="h-28 mt-6 relative">
                <svg viewBox="0 0 200 80" className="w-full h-full text-sky-400/70">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    points="0,60 30,40 50,30 70,45 95,20 120,45 140,30 165,45 190,35"
                  />
                </svg>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>

              {/* Volume bars */}
              <div className="flex items-end gap-[4px] h-16 mt-5">
                {[10, 24, 16, 32, 20, 42, 18, 28, 36, 14, 30, 22].map((h, idx) => (
                  <div key={idx} className="flex-1 flex items-end justify-center">
                    <div
                      className="w-[6px] rounded-full bg-gradient-to-t from-slate-800 via-sky-500/60 to-yellow-300/70"
                      style={{ height: `${h}px` }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 text-[12px] text-slate-400">
                Keep execution systematic: setup → risk → allocation → review.
                Your dashboard stays clean, fast, and consistent.
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/25 bg-black/40 text-slate-300">
                  Email verification
                </span>
                <span className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/25 bg-black/40 text-slate-300">
                  Wallet tracking
                </span>
                <span className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/25 bg-black/40 text-slate-300">
                  Affiliate overview
                </span>
              </div>
            </div>
          </div>

          <footer className="mt-10 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} Day Trader • Secure sign-in • Verification required
          </footer>
        </main>
      </div>
    </div>
  );
}

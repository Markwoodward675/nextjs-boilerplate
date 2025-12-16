// app/page.jsx
import Link from "next/link";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";

export default function HomePage() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] bg-black bg-cover bg-center"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      <div className="min-h-[calc(100vh-64px)] bg-black/70">
        <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div className="bg-black/75 border border-yellow-500/25 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Markets • Wallets • Execution
              </div>

              <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-100">
                One platform to manage trading, wallets, and affiliate earnings.
              </h1>

              <p className="mt-3 text-sm md:text-base text-slate-300">
                Track balances, monitor activity, manage deposits/withdrawals,
                and keep a clean view of performance — built for speed,
                stability, and serious execution.
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

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-yellow-500/15 bg-black/40 px-4 py-3">
                  <div className="text-[11px] text-slate-400">Security</div>
                  <div className="text-sm text-slate-200 mt-1">
                    Email verification
                  </div>
                </div>
                <div className="rounded-xl border border-yellow-500/15 bg-black/40 px-4 py-3">
                  <div className="text-[11px] text-slate-400">Wallets</div>
                  <div className="text-sm text-slate-200 mt-1">
                    Multi-balance view
                  </div>
                </div>
                <div className="rounded-xl border border-yellow-500/15 bg-black/40 px-4 py-3">
                  <div className="text-[11px] text-slate-400">Affiliate</div>
                  <div className="text-sm text-slate-200 mt-1">
                    Earnings tracking
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="bg-black/75 border border-yellow-500/25 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Live market view
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    BTC · ETH · Stablecoins · Index
                  </div>
                </div>
                <div className="text-[10px] text-yellow-200 px-3 py-1 rounded-full border border-yellow-500/30 bg-black/50">
                  Risk-controlled mode
                </div>
              </div>

              {/* stylized line */}
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

              {/* volume bars */}
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
                Built for clean execution: balances, activity, and workflow in one place —
                fast to navigate, easy to understand.
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/25 bg-black/40 text-slate-300">
                  Secure sign-in
                </span>
                <span className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/25 bg-black/40 text-slate-300">
                  Deposits & Withdrawals
                </span>
                <span className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/25 bg-black/40 text-slate-300">
                  Real-time insights
                </span>
              </div>
            </div>
          </div>

          <footer className="mt-10 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} Day Trader • All rights reserved
          </footer>
        </main>
      </div>
    </div>
  );
}

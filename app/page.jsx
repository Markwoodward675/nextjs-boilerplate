// app/page.jsx
import Link from "next/link";

const BG =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=80"; // tech background

export default function HomePage() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] bg-black bg-cover bg-center"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      {/* Dark overlay + warm glow */}
      <div className="min-h-[calc(100vh-64px)] bg-black/75">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl bg-yellow-500/15" />
          <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl bg-orange-500/15" />
          <div className="absolute bottom-10 -right-40 h-[520px] w-[520px] rounded-full blur-3xl bg-amber-500/10" />
        </div>

        <main className="relative max-w-6xl mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Left: hero */}
            <section className="rounded-2xl border border-yellow-500/20 bg-black/70 shadow-2xl backdrop-blur p-6 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/25 bg-black/60 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-[11px] uppercase tracking-[0.26em] text-amber-200/70">
                  Markets • Wallets • Execution
                </span>
              </div>

              <h1 className="mt-4 text-3xl md:text-4xl font-semibold text-amber-100/90">
                Trade faster. Track smarter. Control your flow.
              </h1>

              <p className="mt-3 text-sm md:text-base text-amber-200/55 max-w-xl">
                A modern platform for managing deposits, withdrawals, wallet balances,
                trading activity, and affiliate performance — built with a clean workflow
                and a hard focus on speed.
              </p>

              {/* Carded actions */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/signup"
                  className="group rounded-2xl border border-yellow-500/25 bg-gradient-to-b from-yellow-500/20 via-orange-500/10 to-black/70 p-4 shadow-lg transition hover:-translate-y-[1px] hover:border-yellow-400/60 hover:shadow-yellow-500/10 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-yellow-300">
                        Create account
                      </div>
                      <div className="mt-1 text-[12px] text-amber-200/55">
                        Get started in minutes
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl border border-yellow-500/25 bg-black/60 flex items-center justify-center text-yellow-300 transition group-hover:border-yellow-400/60">
                      →
                    </div>
                  </div>
                </Link>

                <Link
                  href="/signin"
                  className="group rounded-2xl border border-orange-500/25 bg-gradient-to-b from-orange-500/15 via-yellow-500/5 to-black/70 p-4 shadow-lg transition hover:-translate-y-[1px] hover:border-orange-400/60 hover:shadow-orange-500/10 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-amber-200/85">
                        Sign in
                      </div>
                      <div className="mt-1 text-[12px] text-amber-200/55">
                        Continue to your dashboard
                      </div>
                    </div>
                    <div className="h-9 w-9 rounded-xl border border-orange-500/25 bg-black/60 flex items-center justify-center text-amber-200/85 transition group-hover:border-orange-400/60">
                      →
                    </div>
                  </div>
                </Link>
              </div>

              {/* Forgot password card */}
              <div className="mt-3">
                <Link
                  href="/forgot-password"
                  className="group block rounded-2xl border border-yellow-500/10 bg-black/60 p-4 transition hover:border-yellow-500/30 hover:bg-black/70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-amber-200/75">
                        Forgot password?
                      </div>
                      <div className="text-[11px] text-amber-200/45 mt-1">
                        Reset access securely
                      </div>
                    </div>
                    <div className="text-[11px] text-yellow-300/80 group-hover:text-yellow-300">
                      Open →
                    </div>
                  </div>
                </Link>
              </div>

              {/* Mini feature chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Secure verification",
                  "Wallet overview",
                  "Deposits & Withdrawals",
                  "Affiliate earnings",
                ].map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-3 py-1 rounded-full border border-yellow-500/15 bg-black/50 text-amber-200/55"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>

            {/* Right: dashboard preview card */}
            <section className="rounded-2xl border border-yellow-500/20 bg-black/70 shadow-2xl backdrop-blur p-6 md:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/45">
                    Live market snapshot
                  </div>
                  <div className="text-sm text-amber-200/70 mt-1">
                    BTC · ETH · Stablecoins · Indices
                  </div>
                </div>
                <div className="text-[10px] text-yellow-300/80 px-3 py-1 rounded-full border border-yellow-500/20 bg-black/60">
                  Precision mode
                </div>
              </div>

              {/* Stylized line */}
              <div className="h-28 mt-6 relative">
                <svg viewBox="0 0 200 80" className="w-full h-full text-yellow-300/40">
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

              {/* Warm volume bars */}
              <div className="flex items-end gap-[4px] h-16 mt-5">
                {[10, 24, 16, 32, 20, 42, 18, 28, 36, 14, 30, 22].map((h, idx) => (
                  <div key={idx} className="flex-1 flex items-end justify-center">
                    <div
                      className="w-[6px] rounded-full bg-gradient-to-t from-slate-900 via-orange-500/35 to-yellow-300/45"
                      style={{ height: `${h}px` }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 text-[12px] text-amber-200/45">
                A clean view of balances, activity, and performance — designed for fast
                decision-making in motion.
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-yellow-500/10 bg-black/55 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/40">
                    Wallets
                  </div>
                  <div className="mt-2 text-sm font-semibold text-amber-200/70">
                    Multi-balance view
                  </div>
                </div>
                <div className="rounded-xl border border-orange-500/10 bg-black/55 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/40">
                    Activity
                  </div>
                  <div className="mt-2 text-sm font-semibold text-amber-200/70">
                    Transactions feed
                  </div>
                </div>
              </div>
            </section>
          </div>

          <footer className="mt-10 text-center text-[11px] text-amber-200/35">
            © {new Date().getFullYear()} Day Trader
          </footer>
        </main>
      </div>
    </div>
  );
}

// app/page.jsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="dt-shell dt-landing">
      <section className="dt-hero">
        <div className="dt-hero-left">
          <div className="dt-kicker">Markets • Wallets • Execution</div>

          <h1 className="dt-h1">
            Trade faster. Track smarter.{" "}
            <span className="dt-h1-accent">Control your flow.</span>
          </h1>

          <p className="dt-lead">
            A modern platform for managing deposits, withdrawals, wallet balances,
            trading activity, and affiliate performance — built with a clean workflow
            and a hard focus on speed.
          </p>

          <div className="dt-action-grid">
            <Link href="/signup" className="dt-action-card dt-action-primary">
              <div>
                <div className="dt-action-title">Create account</div>
                <div className="dt-action-sub">Get started in minutes</div>
              </div>
              <div className="dt-action-arrow">→</div>
            </Link>

            <Link href="/signin" className="dt-action-card">
              <div>
                <div className="dt-action-title">Sign in</div>
                <div className="dt-action-sub">Continue to your dashboard</div>
              </div>
              <div className="dt-action-arrow">→</div>
            </Link>

            <Link href="/forgot-password" className="dt-action-card dt-action-muted">
              <div>
                <div className="dt-action-title">Forgot password?</div>
                <div className="dt-action-sub">Reset access securely</div>
              </div>
              <div className="dt-action-arrow">Open →</div>
            </Link>
          </div>

          <div className="dt-features">
            <div className="dt-pill">Secure verification</div>
            <div className="dt-pill">Wallet overview</div>
            <div className="dt-pill">Deposits & Withdrawals</div>
            <div className="dt-pill">Affiliate earnings</div>
          </div>
        </div>

        <div className="dt-hero-right">
          <div className="dt-panel">
            <div className="dt-panel-top">
              <div>
                <div className="dt-panel-kicker">Live market snapshot</div>
                <div className="dt-panel-sub">BTC · ETH · Stablecoins · Indices</div>
              </div>
              <div className="dt-badge">Precision mode</div>
            </div>

            <div className="dt-scan" aria-hidden />

            <div className="dt-panel-text">
              A clean view of balances, activity, and performance — designed for fast
              decision-making in motion.
            </div>

            <div className="dt-mini-grid">
              <div className="dt-mini">
                <div className="dt-mini-title">Wallets</div>
                <div className="dt-mini-sub">Multi-balance view</div>
              </div>
              <div className="dt-mini">
                <div className="dt-mini-title">Activity</div>
                <div className="dt-mini-sub">Transactions feed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="dt-footer">
        © {new Date().getFullYear()} Day Trader
      </footer>
    </main>
  );
}

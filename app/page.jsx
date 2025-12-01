import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-[70vh] flex items-center">
      <div className="w-full text-center md:text-left">
        <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-400">
          Trading · Investments · Wallets
        </span>

        <h1 className="mt-3 text-3xl md:text-4xl font-bold text-blue-100">
          Day Trader — a modern platform to organize your trading, investments,
          and affiliate earnings.
        </h1>

        <p className="mt-3 text-sm md:text-base text-slate-300 max-w-xl mx-auto md:mx-0">
          Create an account, connect your wallets and strategies, track markets,
          and prepare trades. Live order execution and custody of funds are
          always handled by your own regulated broker or exchange.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center md:justify-start">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Create account
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900"
          >
            Log in
          </Link>
        </div>

        <p className="mt-4 text-[11px] text-slate-500 max-w-xl mx-auto md:mx-0">
          Day Trader provides tools and data for traders and investors. It does
          not execute trades, hold client funds, or provide personalized
          investment advice.
        </p>
      </div>
    </main>
  );
}

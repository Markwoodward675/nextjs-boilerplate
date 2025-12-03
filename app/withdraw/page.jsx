"use client";

import Card from "../../components/Card";

export default function WithdrawPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Withdraw funds
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Move capital out of Day Trader wallets to your own bank, exchange, or
          stablecoin addresses. Treat withdrawals as part of a structured risk
          and payout plan.
        </p>
      </Card>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Bank & fiat payouts
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Configure where funds should land when you reduce risk or pay
            yourself. You can separate trading payouts from regular living
            expenses.
          </p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[11px] text-slate-500">Preferred payout</p>
              <p className="mt-1 text-slate-200">
                Bank account · primary currency
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Add payout details in Settings when you are ready to go live.
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Withdrawal cadence</p>
              <p className="mt-1 text-slate-200">Weekly or monthly</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Decide in advance how often you pull capital out so emotions
                don&apos;t dictate cashflow.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Crypto withdrawals
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Map on-chain payouts to your own custodial or non-custodial
            wallets. Use stablecoins when you want volatility off the table.
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Protect downside
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Decide your minimum monthly payout so you never give back entire
            profitable periods by continuing to scale risk indefinitely.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Reward discipline
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Connect withdrawals to behavior, not just P&amp;L. Reward sticking
            to your plan, not just big wins.
          </p>
        </Card>
      </section>
    </main>
  );
}

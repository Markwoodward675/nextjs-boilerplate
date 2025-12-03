"use client";

import Card from "../../components/Card";

export default function TradePage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Trading layout
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Use this workspace to combine market structure, execution plans, and
          risk parameters into one repeatable process. Your orders are still
          routed through your own broker or exchange.
        </p>
      </Card>

      {/* Main charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            BTC / USDT
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            Head and shoulders pattern
          </h2>
          <div className="mt-3 h-32 relative chart-grid rounded-xl overflow-hidden">
            <svg viewBox="0 0 200 80" className="w-full h-full text-sky-400">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                points="0,60 25,40 45,30 65,42 95,18 125,42 145,30 170,45 200,35"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Identify fair, clear structures instead of forcing trades in random
            noise. Decide risk, invalidation, and execution in advance.
          </p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            ETH / BTC
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            Trend + pullbacks
          </h2>
          <div className="mt-3 h-32 relative chart-grid rounded-xl overflow-hidden">
            <svg viewBox="0 0 200 80" className="w-full h-full text-emerald-400">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                points="0,65 20,55 35,60 55,45 70,50 90,35 110,42 130,28 155,34 180,24 200,26"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Map higher timeframe direction, then execute on lower timeframes
            with clear pullback zones and stop placements.
          </p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Volume / rotations
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-100">
            Multi-bar flows
          </h2>
          <div className="mt-3 h-32 flex items-end gap-[3px]">
            {[8, 26, 14, 36, 21, 40, 18, 30, 24, 16, 28, 34].map((h, idx) => (
              <div
                key={idx}
                className="flex-1 flex items-end justify-center"
              >
                <div
                  className="w-[7px] rounded-full bg-gradient-to-t from-slate-800 via-emerald-500/80 to-sky-400/80"
                  style={{ height: `${h}px` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Track where volume and attention are rotating rather than chasing
            moves after they are already extended.
          </p>
        </Card>
      </section>

      {/* Risk + plan */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Risk plan per trade
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Decide risk per trade, per day, and per week before the session
            begins. This workspace is built around discipline first, entries
            second.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Execution checklists
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Codify your setups into checklists you can actually follow. Remove
            improvisation and turn your playbook into repeatable behavior.
          </p>
        </Card>
      </section>
    </main>
  );
}

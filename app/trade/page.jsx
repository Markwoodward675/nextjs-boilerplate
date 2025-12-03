"use client";

import Card from "../../components/Card";

export default function TradePage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Crypto trading workspace
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Use this layout to plan and track your trades on BTC, ETH, and other
          majors. Actual order execution happens with your own exchanges or
          brokers.
        </p>
      </Card>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                BTC / USDT
              </p>
              <p className="text-sm text-slate-100 font-semibold">
                91,661.79
                <span className="ml-2 text-[11px] text-emerald-400">
                  +5.89%
                </span>
              </p>
            </div>
            <div className="text-[10px] text-slate-400">
              <span className="mr-2">1m</span>
              <span className="mr-2 text-slate-200">5m</span>
              <span className="mr-2">15m</span>
              <span>1h</span>
            </div>
          </div>

          <div className="h-44 rounded-xl chart-grid overflow-hidden relative">
            <svg viewBox="0 0 200 100" className="w-full h-full text-sky-400">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                points="0,80 10,76 20,70 30,74 40,60 50,64 60,48 70,56 80,40 90,46 100,33 110,42 120,30 130,36 140,26 150,32 160,22 170,30 180,20 190,26 200,18"
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Mark your levels, invalidation, and target zones here before you
            place orders on your exchange.
          </p>
        </Card>

        {/* Order ticket */}
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
            Order ticket (planning)
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[11px]">
              <button className="flex-1 rounded-full bg-emerald-600 py-1 text-slate-950 font-medium">
                Buy
              </button>
              <button className="flex-1 rounded-full bg-red-500/10 text-red-300 border border-red-500/40 py-1">
                Sell
              </button>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-1">
                Size (USDT)
              </p>
              <input
                type="number"
                placeholder="500"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-1">
                Entry price
              </p>
              <input
                type="number"
                placeholder="91661.79"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-slate-500 mb-1">
                  Stop loss
                </p>
                <input
                  type="number"
                  placeholder="89000"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 mb-1">
                  Take profit
                </p>
                <input
                  type="number"
                  placeholder="95500"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Use this ticket to define plan size, risk, and targets. Execute
              the order on your exchange according to this plan.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Sparkline from "./Sparkline";

export default function MarketPanel({ kind = "stock", symbol = "AAPL" }) {
  const [state, setState] = useState({ loading: true, err: "", quote: null, series: [] });

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setState({ loading: true, err: "", quote: null, series: [] });

        const r = await fetch(`/api/market?kind=${encodeURIComponent(kind)}&symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j?.error || "Market fetch failed");

        if (!cancel) {
          setState({
            loading: false,
            err: "",
            quote: j.quote || null,
            series: j.series || [],
          });
        }
      } catch (e) {
        if (!cancel) setState({ loading: false, err: e?.message || "Market error", quote: null, series: [] });
      }
    })();

    return () => { cancel = true; };
  }, [kind, symbol]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-200">Market</div>
        <div className="text-xs text-slate-500">{kind.toUpperCase()} • {symbol}</div>
      </div>

      {state.loading ? (
        <div className="mt-3 text-sm text-slate-400">Fetching quote…</div>
      ) : state.err ? (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {state.err}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-500">Last</div>
              <div className="text-lg font-semibold text-slate-100">{state.quote?.last ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="text-[11px] text-slate-500">Change</div>
              <div className="text-lg font-semibold text-slate-100">{state.quote?.change ?? "—"}</div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] text-slate-500 mb-1">30-day trend</div>
            <Sparkline points={state.series} />
          </div>

          {state.quote?.source ? (
            <div className="mt-2 text-[11px] text-slate-500">Source: {state.quote.source}</div>
          ) : null}
        </>
      )}
    </div>
  );
}

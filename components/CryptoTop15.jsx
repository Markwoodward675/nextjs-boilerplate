"use client";

import { useEffect, useState } from "react";

const fmt = (n) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 6 });
const money = (n) => (n == null ? "—" : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

export default function CryptoTop15() {
  const [state, setState] = useState({ loading: true, err: "", rows: [] });

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setState({ loading: true, err: "", rows: [] });
        const r = await fetch("/api/crypto/top", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j?.error || "Unable to load crypto");
        if (!cancel) setState({ loading: false, err: "", rows: j.rows || [] });
      } catch (e) {
        if (!cancel) setState({ loading: false, err: e?.message || "Crypto error", rows: [] });
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="text-sm font-semibold text-slate-200">Top Crypto</div>
        <div className="text-xs text-slate-500">Top 15 • USD</div>
      </div>

      {state.loading ? (
        <div className="px-4 py-6 text-sm text-slate-400">Loading…</div>
      ) : state.err ? (
        <div className="px-4 py-4 text-sm text-rose-200">{state.err}</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-2 font-medium">Asset</th>
                <th className="text-right px-4 py-2 font-medium">Price</th>
                <th className="text-right px-4 py-2 font-medium">24h</th>
                <th className="text-right px-4 py-2 font-medium">MCap</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/70 hover:bg-slate-800/20 transition">
                  <td className="px-4 py-2">
                    <div className="text-slate-100 font-semibold">{c.symbol}</div>
                    <div className="text-xs text-slate-500">{c.name}</div>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-100 font-semibold">{money(c.price)}</td>
                  <td className="px-4 py-2 text-right text-slate-200">{fmt(c.ch24)}%</td>
                  <td className="px-4 py-2 text-right text-slate-200">{money(c.mcap)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

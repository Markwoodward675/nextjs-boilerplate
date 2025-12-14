"use client";

export default function MetricStrip({ items = [] }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((m, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">{m.label}</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{m.value}</div>
          {m.sub ? <div className="mt-1 text-xs text-slate-500">{m.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

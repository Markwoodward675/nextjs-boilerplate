"use client";

export default function Sparkline({ points = [], height = 48 }) {
  if (!points || points.length < 2) {
    return <div className="h-12 rounded-xl border border-slate-800 bg-slate-950/30" />;
  }

  const w = 220;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1e-9, max - min);

  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-200/80" />
    </svg>
  );
}

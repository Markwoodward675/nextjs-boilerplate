export default function TradeCard({ symbol, price, change }) {
  const isUp = change >= 0;
  return (
    <div className="card flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-slate-100">{symbol}</div>
        <div className="text-[11px] text-slate-500">Tracked asset</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">
          {price != null ? `$${price.toFixed(2)}` : "—"}
        </div>
        <div
          className={`text-[11px] ${
            isUp ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {isUp ? "+" : ""}
          {change?.toFixed(2) ?? "0.00"}%
        </div>
      </div>
    </div>
  );
}

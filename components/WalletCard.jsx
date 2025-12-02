export default function WalletCard({ wallet }) {
  const lastFour = wallet.$id?.slice(-4) || "0000";
  const label =
    wallet.type === "affiliate"
      ? "Affiliate Wallet"
      : wallet.type === "trading"
      ? "Trading Wallet"
      : "Main Wallet";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 px-4 py-4">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-700/20" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-emerald-600/10" />

      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            {wallet.currency} · {wallet.status || "active"}
          </div>
        </div>
        <div className="h-7 w-10 rounded-xl border border-slate-500/50 flex items-center justify-center text-[9px] font-semibold text-slate-200">
          DAY
        </div>
      </div>

      <div className="relative mt-4 flex items-end justify-between">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-[0.16em]">
            Available balance
          </div>
          <div className="mt-1 text-2xl font-semibold text-blue-200">
            {wallet.balance?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}{" "}
            <span className="text-sm text-slate-300">{wallet.currency}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Wallet ID</div>
          <div className="mt-1 text-xs font-mono text-slate-200">
            **** **** **** {lastFour}
          </div>
        </div>
      </div>
    </div>
  );
}

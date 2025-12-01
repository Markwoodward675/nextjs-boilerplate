export default function WalletCard({ wallet }) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            {wallet.type === "affiliate"
              ? "Affiliate Wallet"
              : wallet.type === "trading"
              ? "Trading Wallet"
              : "Main Wallet"}
          </div>
          <div className="text-sm font-semibold text-slate-100">
            {wallet.currency} · {wallet.status || "active"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Balance</div>
          <div className="text-lg font-bold text-blue-400">
            {wallet.balance?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}{" "}
            {wallet.currency}
          </div>
        </div>
      </div>
    </div>
  );
}

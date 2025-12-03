export default function DepositCancelPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl border border-slate-700/60 bg-slate-950/60 px-5 py-6 text-center">
        <h1 className="text-sm font-semibold text-slate-100">
          Deposit cancelled
        </h1>
        <p className="mt-2 text-xs text-slate-400">
          This deposit flow was cancelled or expired. You can start a new
          deposit from the Wallets or Deposit section.
        </p>
      </div>
    </main>
  );
}

export default function DepositSuccessPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl border border-emerald-700/60 bg-emerald-950/40 px-5 py-6 text-center">
        <h1 className="text-sm font-semibold text-emerald-300">
          Deposit successful
        </h1>
        <p className="mt-2 text-xs text-emerald-100/80">
          Your crypto payment has been received by NOWPayments. Once confirmed
          and verified by admin, your Day Trader wallet balance will be updated.
        </p>
      </div>
    </main>
  );
}

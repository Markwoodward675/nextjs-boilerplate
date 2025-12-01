import Card from "../../components/Card";

export default function WithdrawPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">Withdrawals</h1>
        <p className="mt-1 text-xs text-slate-400">
          Configure withdrawal methods, minimums, review steps, and payout
          providers for wallet balances and affiliate earnings. All payouts are
          settled through your chosen payment channels.
        </p>
      </Card>
    </main>
  );
}

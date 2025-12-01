import Card from "../../components/Card";

export default function WalletPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Wallet management
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Create and manage wallets for trading, long-term investments, and
          affiliate payouts. Integrations with live exchanges and banking rails
          will be wired here.
        </p>
      </Card>
    </main>
  );
}

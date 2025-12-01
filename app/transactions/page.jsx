import Card from "../../components/Card";

export default function TransactionsPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Transaction history
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          This page will surface deposits, withdrawals, internal transfers,
          P&amp;L adjustments, and affiliate commission movements, powered by
          your Appwrite <span className="font-mono">transactions</span>{" "}
          collection.
        </p>
      </Card>
    </main>
  );
}

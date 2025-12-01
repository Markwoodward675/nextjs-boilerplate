import Card from "../../components/Card";

export default function DepositPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">Deposit flows</h1>
        <p className="mt-1 text-xs text-slate-400">
          Connect payment providers (crypto gateways, bank transfers, card
          processors) so users can fund their wallets. On/off-ramp processing is
          carried out by these providers, not by Day Trader.
        </p>
      </Card>
    </main>
  );
}

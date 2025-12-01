import Card from "../../../components/Card";

export default function BuyGiftCardsPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Buy gift cards with your balance
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Connect gift card partners and allow users to spend wallet balances on
          digital gift cards. Providers handle the actual issuance and delivery.
        </p>
      </Card>
    </main>
  );
}

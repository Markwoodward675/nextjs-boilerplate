import Card from "../../../components/Card";

export default function SellGiftCardsPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Sell gift cards for balance
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Support regions and providers where users can convert unused gift
          cards into wallet balance. Actual processing is handled by your
          integrated partners.
        </p>
      </Card>
    </main>
  );
}

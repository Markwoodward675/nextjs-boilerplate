"use client";

import Card from "../../../components/Card";

export default function BuyGiftCardsPage() {
  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Buy gift cards
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Convert a portion of your trading and affiliate earnings into digital
          gift cards for everyday spending, rewards, or team incentives.
        </p>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Global brands
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Map earnings into brands and platforms you already use. Treat gift
            cards as controlled, pre-allocated spending.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Controlled payouts
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Use gift cards as a way to reward trading performance without
            automatically increasing risk size.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Simple flows
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            A clean workflow for selecting brands, choosing denominations, and
            confirming gift card issuance.
          </p>
        </Card>
      </section>
    </main>
  );
}

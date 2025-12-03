"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import WalletCard from "../../components/WalletCard";
import { getCurrentUser } from "../../lib/api";

const sampleWallets = [
  {
    $id: "main-xxx1",
    type: "main",
    currency: "USD",
    status: "active",
    balance: 0
  },
  {
    $id: "trading-xxx2",
    type: "trading",
    currency: "USD",
    status: "active",
    balance: 0
  },
  {
    $id: "affiliate-xxx3",
    type: "affiliate",
    currency: "USD",
    status: "active",
    balance: 0
  }
];

export default function WalletPage() {
  const [user, setUser] = useState(null);
  // You can later replace sampleWallets with real data from Appwrite.
  const [wallets] = useState(sampleWallets);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Wallets & balances
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Keep capital separated by purpose – main wallet for funding, trading
          wallet for risk, affiliate wallet for payouts. All visible at a
          glance.
        </p>
      </Card>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {wallets.map((w) => (
          <WalletCard key={w.$id} wallet={w} />
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Funding & flows
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Use Deposits to add capital, then move funds between wallets to
            reflect how much risk you want active. Withdraw to external
            accounts when you lock in results.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Allocation discipline
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Keeping trading and affiliate balances separated prevents blurred
            decisions. Capital for trades, capital for expenses, and capital for
            compounding can be tracked independently.
          </p>
        </Card>
      </section>
    </main>
  );
}

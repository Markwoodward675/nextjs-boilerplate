"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../../components/MetricStrip";
import { getCurrentUser, getUserWallets } from "../../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function GiftcardsBuyPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      if (cancel) return;
      setMe(u);
      setWallets((await getUserWallets(u.$id)) || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [router]);

  const main = useMemo(() => (wallets || []).find((w) => w.currencyType === "main") || null, [wallets]);

  const metrics = [
    { label: "Funding Source", value: "Main Account", sub: "wallet: main" },
    { label: "Available", value: money(main?.balance), sub: "balance" },
    { label: "Module", value: "Marketplace", sub: "giftcards" },
    { label: "State", value: "Read-only", sub: "no fulfillment" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading marketplace…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Giftcard Marketplace</h1>
          <p className="text-sm text-slate-400">Listings and pricing (terminal view).</p>
        </div>

        <MetricStrip items={metrics} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-200">Listings</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {["Amazon", "iTunes", "Steam"].map((name) => (
              <div key={name} className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4">
                <div className="text-sm font-semibold">{name}</div>
                <div className="mt-1 text-xs text-slate-500">Terminal listing</div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
                  onClick={() => alert("Next: create marketplace order + transaction write.")}
                >
                  Create Order
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

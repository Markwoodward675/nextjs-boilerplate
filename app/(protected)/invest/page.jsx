"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import MarketPanel from "../../../components/MarketPanel";
import { getCurrentUser, getUserWallets, getUserTransactions } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function InvestPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;
        setMe(u);

        const [ws, t] = await Promise.all([getUserWallets(u.$id), getUserTransactions(u.$id)]);
        if (!cancel) {
          setWallets(ws || []);
          setTxs(t || []);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load allocations.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const main = useMemo(() => (wallets || []).find((w) => w.currencyType === "main") || null, [wallets]);
  const investRows = useMemo(
    () => (txs || []).filter((t) => t.category === "invest" || t.type === "invest").slice(0, 25),
    [txs]
  );

  const metrics = [
    { label: "Capital Base", value: money(main?.balance), sub: "wallet: main" },
    { label: "Allocations", value: String(investRows.length), sub: "last 25" },
    { label: "Exposure", value: "Controlled", sub: "paper environment" },
    { label: "Data State", value: err ? "Degraded" : "Normal", sub: err ? "source error" : "ok" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading allocations…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div>
            <h1 className="text-2xl font-semibold">Allocation Console</h1>
            <p className="text-sm text-slate-400">Investment simulations and allocation history.</p>
          </div>
          <div className="w-full lg:w-[420px]">
            <MarketPanel kind="crypto" symbol="BTC" />
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />
        <BlotterTable rows={investRows} title="Allocation Blotter" />
      </div>
    </UnverifiedEmailGate>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import MarketPanel from "../../../components/MarketPanel";
import { getCurrentUser, getUserWallets, getUserTransactions } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function TradePage() {
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
        if (!cancel) setErr(e?.message || "Unable to load trade module.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const trading = useMemo(() => (wallets || []).find((w) => w.currencyType === "trading") || null, [wallets]);
  const tradeRows = useMemo(
    () => (txs || []).filter((t) => t.category === "trade" || t.type === "trade").slice(0, 25),
    [txs]
  );

  const metrics = [
    { label: "Trading Balance", value: money(trading?.balance), sub: "wallet: trading" },
    { label: "Executions", value: String(tradeRows.length), sub: "last 25" },
    { label: "Risk State", value: err ? "Degraded" : "Normal", sub: err ? "data source error" : "ok" },
    { label: "Session", value: "Active", sub: "paper environment" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading trade…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div>
            <h1 className="text-2xl font-semibold">Execution Terminal</h1>
            <p className="text-sm text-slate-400">Positions, risk, and execution blotter.</p>
          </div>
          <div className="w-full lg:w-[420px]">
            <MarketPanel kind="stock" symbol="AAPL" />
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />

        <BlotterTable rows={tradeRows} title="Execution Blotter" />
      </div>
    </UnverifiedEmailGate>
  );
}

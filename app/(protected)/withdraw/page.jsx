"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import { getCurrentUser, getUserWallets, getUserTransactions } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function WithdrawPage() {
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
        if (!cancel) setErr(e?.message || "Unable to load withdrawals.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const main = useMemo(() => (wallets || []).find((w) => w.currencyType === "main") || null, [wallets]);
  const withdrawRows = useMemo(
    () => (txs || []).filter((t) => t.category === "withdraw" || t.type === "withdraw").slice(0, 25),
    [txs]
  );

  const metrics = [
    { label: "Main Balance", value: money(main?.balance), sub: "available" },
    { label: "Requests", value: String(withdrawRows.length), sub: "last 25" },
    { label: "Queue", value: "Manual", sub: "policy controlled" },
    { label: "Data State", value: err ? "Degraded" : "Normal", sub: err ? "source error" : "ok" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading withdrawals…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Withdrawal Queue</h1>
          <p className="text-sm text-slate-400">Request tracking and settlement status.</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />
        <BlotterTable rows={withdrawRows} title="Withdrawal Blotter" />
      </div>
    </UnverifiedEmailGate>
  );
}

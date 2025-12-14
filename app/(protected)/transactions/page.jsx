"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import { getCurrentUser, getUserTransactions } from "../../../lib/api";

export default function TransactionsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
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

        const t = await getUserTransactions(u.$id);
        if (!cancel) setTxs(t || []);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load blotter.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const sorted = useMemo(() => {
    return [...(txs || [])].sort((a, b) => {
      const da = new Date(a.createdAt || a.$createdAt).getTime() || 0;
      const db = new Date(b.createdAt || b.$createdAt).getTime() || 0;
      return db - da;
    }).slice(0, 50);
  }, [txs]);

  const counts = useMemo(() => {
    const c = { deposit: 0, withdraw: 0, trade: 0, invest: 0 };
    (sorted || []).forEach((t) => {
      const k = t.category || t.type;
      if (c[k] != null) c[k] += 1;
    });
    return c;
  }, [sorted]);

  const metrics = [
    { label: "Records", value: String(sorted.length), sub: "last 50" },
    { label: "Deposits", value: String(counts.deposit), sub: "ledger" },
    { label: "Trades", value: String(counts.trade), sub: "executions" },
    { label: "State", value: err ? "Degraded" : "Normal", sub: err ? "source error" : "ok" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading blotter…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Execution Ledger</h1>
          <p className="text-sm text-slate-400">Unified activity blotter across modules.</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />
        <BlotterTable rows={sorted} title="Unified Blotter" />
      </div>
    </UnverifiedEmailGate>
  );
}

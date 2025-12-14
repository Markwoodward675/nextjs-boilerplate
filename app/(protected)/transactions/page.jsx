"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import AvatarModal from "../../../components/AvatarModal";
import AppShellPro from "../../../components/AppShellPro";
import { getCurrentUser, getUserTransactions, getUserProfile } from "../../../lib/api";

export default function TransactionsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
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

        const [p, t] = await Promise.all([
          getUserProfile(u.$id).catch(() => null),
          getUserTransactions(u.$id),
        ]);

        if (!cancel) {
          setProfile(p);
          setTxs(t || []);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load transactions.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const rows = useMemo(() => {
    return [...(txs || [])]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.$createdAt).getTime() -
          new Date(a.createdAt || a.$createdAt).getTime()
      )
      .slice(0, 50);
  }, [txs]);

  const counts = useMemo(() => {
    const c = {};
    rows.forEach((t) => {
      const k = (t.category || t.type || "other").toLowerCase();
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [rows]);

  const metrics = [
    { label: "Records", value: String(rows.length), sub: "Last 50" },
    { label: "Deposits", value: String(counts.deposit || 0), sub: "Count" },
    { label: "Withdrawals", value: String(counts.withdraw || 0), sub: "Count" },
    { label: "Investments", value: String(counts.invest || 0), sub: "Count" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>;
  if (!me) return null;

  return (
    <AppShellPro rightSlot={<AvatarModal profile={profile} />}>
      <UnverifiedEmailGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Transactions</h1>
            <p className="text-sm text-slate-400">Executed activity across accounts.</p>
          </div>

          {err ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{err}</div>
          ) : null}

          <MetricStrip items={metrics} />
          <BlotterTable title="Executed Transactions" rows={rows} />
        </div>
      </UnverifiedEmailGate>
    </AppShellPro>
  );
}

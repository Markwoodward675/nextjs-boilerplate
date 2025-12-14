"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import BlotterTable from "../../../components/BlotterTable";
import { getCurrentUser, getUserWallets, getUserTransactions } from "../../../lib/api";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function MultiBalanceCard({ main = 0, trading = 0, affiliate = 0 }) {
  const total = Number(main || 0) + Number(trading || 0) + Number(affiliate || 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/50">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-slate-900/10 to-transparent" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Wallet</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Balances</div>
          </div>
          <div className="text-xs text-slate-500">DT • 9013</div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-400">Total</div>
          <div className="mt-1 text-3xl font-semibold text-slate-100">{money(total)}</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Main</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{money(main)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Trading</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{money(trading)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Affiliate</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{money(affiliate)}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1">
            Active
          </div>
          <div className="tracking-widest">•••• •••• •••• 9013</div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
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
        const [ws, t] = await Promise.all([
          getUserWallets(u.$id),
          getUserTransactions(u.$id),
        ]);

        if (!cancel) {
          setWallets(ws || []);
          setTxs(t || []);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load wallets.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const byType = useMemo(() => {
    const map = { main: 0, trading: 0, affiliate: 0 };
    (wallets || []).forEach((w) => {
      if (w?.currencyType && map[w.currencyType] != null) map[w.currencyType] = w.balance || 0;
    });
    return map;
  }, [wallets]);

  const recent = useMemo(() => {
    return [...(txs || [])]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.$createdAt).getTime() -
          new Date(a.createdAt || a.$createdAt).getTime()
      )
      .slice(0, 15);
  }, [txs]);

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Wallet</h1>
          <p className="text-sm text-slate-400">Balances and recent activity.</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MultiBalanceCard
          main={byType.main}
          trading={byType.trading}
          affiliate={byType.affiliate}
        />

        <BlotterTable title="Recent Transactions" rows={recent} />
      </div>
    </UnverifiedEmailGate>
  );
}

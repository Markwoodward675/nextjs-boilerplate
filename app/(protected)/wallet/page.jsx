"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import { getCurrentUser, ensureWallets, getUserWallets, getUserTransactions } from "../../../lib/api";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function WalletCard({ totals }) {
  const total = totals.main + totals.trading + totals.affiliate;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950/50">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-slate-900/10 to-transparent" />
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Wallet</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">Balances</div>
          </div>
          <div className="text-xs text-slate-500">DT • {String(Math.random()).slice(2, 6)}</div>
        </div>

        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-widest text-slate-400">Total</div>
          <div className="mt-1 text-3xl font-semibold text-slate-100">{money(total)}</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Main</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{money(totals.main)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Trading</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{money(totals.trading)}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Affiliate</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{money(totals.affiliate)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TxTable({ rows }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30">
      <div className="border-b border-slate-800 p-4">
        <div className="text-sm font-semibold text-slate-100">Recent Transactions</div>
        <div className="text-xs text-slate-400">Latest activity across deposits, withdrawals, and investments.</div>
      </div>

      <div className="p-2">
        {rows.length ? (
          <div className="space-y-2">
            {rows.map((t) => (
              <div
                key={t.$id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {t.type || "Transaction"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(t.createdAt || t.$createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-100">{money(t.amount)}</div>
                  <div className="text-xs text-slate-500">{t.status || "pending"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-400">No transactions yet.</div>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const me = await getCurrentUser();
        if (!me) return router.replace("/signin");

        await ensureWallets(me.$id);

        const [ws, tr] = await Promise.all([
          getUserWallets(me.$id),
          getUserTransactions(me.$id),
        ]);

        if (!cancel) {
          setWallets(ws || []);
          setTxs(tr || []);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load wallet.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const totals = useMemo(() => {
    const t = { main: 0, trading: 0, affiliate: 0 };
    (wallets || []).forEach((w) => {
      if (w?.currencyType === "main") t.main = Number(w.balance || 0);
      if (w?.currencyType === "trading") t.trading = Number(w.balance || 0);
      if (w?.currencyType === "affiliate") t.affiliate = Number(w.balance || 0);
    });
    return t;
  }, [wallets]);

  const recent = useMemo(() => {
    return [...(txs || [])]
      .sort((a, b) => new Date(b.createdAt || b.$createdAt) - new Date(a.createdAt || a.$createdAt))
      .slice(0, 15);
  }, [txs]);

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Wallet</h1>
          <p className="text-sm text-slate-400">Balances and transaction history.</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <WalletCard totals={totals} />
        <TxTable rows={recent} />
      </div>
    </UnverifiedEmailGate>
  );
}

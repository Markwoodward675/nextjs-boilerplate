"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import { getCurrentUser, getUserWallets } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function WalletPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [wallets, setWallets] = useState([]);
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
        const ws = await getUserWallets(u.$id);
        if (!cancel) setWallets(ws || []);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load balances.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const byType = useMemo(() => {
    const map = { main: null, trading: null, affiliate: null };
    (wallets || []).forEach((w) => {
      if (w?.currencyType && map[w.currencyType] === null) map[w.currencyType] = w;
    });
    return map;
  }, [wallets]);

  const metrics = [
    { label: "Main Account", value: money(byType.main?.balance), sub: "currencyType: main" },
    { label: "Trading Account", value: money(byType.trading?.balance), sub: "currencyType: trading" },
    { label: "Affiliate Credits", value: money(byType.affiliate?.balance), sub: "currencyType: affiliate" },
    { label: "Status", value: err ? "Degraded" : "Normal", sub: err ? "data source error" : "all systems nominal" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading balances…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Account Balances</h1>
          <p className="text-sm text-slate-400">Internal allocations and wallet status.</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-200">Wallet integrity</div>
          <div className="mt-2 text-sm text-slate-400">
            Wallets are keyed by <span className="text-slate-200">currencyType</span>. If a wallet is missing, bootstrap must run (sign out/in).
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

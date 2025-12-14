"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import MarketPanel from "../../../components/MarketPanel";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getUserAlerts,
} from "../../../lib/api";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancelled) return;

        setMe(u);

        const [ws, t, a] = await Promise.all([
          getUserWallets(u.$id),
          getUserTransactions(u.$id),
          getUserAlerts(u.$id),
        ]);

        if (!cancelled) {
          setWallets(ws || []);
          setTxs(t || []);
          setAlerts(a || []);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Dashboard data unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const walletByType = useMemo(() => {
    const map = {};
    (wallets || []).forEach((w) => {
      if (w?.currencyType) map[w.currencyType] = w;
    });
    return map;
  }, [wallets]);

  const recentTxs = useMemo(
    () =>
      [...(txs || [])]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.$createdAt).getTime() -
            new Date(a.createdAt || a.$createdAt).getTime()
        )
        .slice(0, 10),
    [txs]
  );

  const metrics = [
    {
      label: "Main Balance",
      value: money(walletByType.main?.balance),
      sub: "capital account",
    },
    {
      label: "Trading Balance",
      value: money(walletByType.trading?.balance),
      sub: "execution account",
    },
    {
      label: "Affiliate Credits",
      value: money(walletByType.affiliate?.balance),
      sub: "referral earnings",
    },
    {
      label: "System Status",
      value: err ? "Degraded" : "Normal",
      sub: err ? "data error" : "operational",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-400">
        Initializing dashboard…
      </div>
    );
  }

  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Overview Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Account balances, activity, and market context.
            </p>
          </div>

          <div className="w-full lg:w-[420px]">
            <MarketPanel kind="stock" symbol="AAPL" />
          </div>
        </div>

        {/* Error */}
        {err && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        )}

        {/* Metrics */}
        <MetricStrip items={metrics} />

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BlotterTable
            title="Recent Activity"
            rows={recentTxs}
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-200">
                Alerts & Notices
              </div>
              <div className="text-xs text-slate-500">
                {alerts.length} total
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="text-sm text-slate-400">
                No alerts recorded.
              </div>
            ) : (
              <ul className="space-y-2">
                {alerts.slice(0, 6).map((a) => (
                  <li
                    key={a.$id}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                  >
                    <div className="text-sm text-slate-200">
                      {a.title || "System notice"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {a.createdAt || a.$createdAt}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-500">
          This platform provides trading simulations and educational analytics.
          It is not a broker, exchange, or investment advisor.
        </div>

      </div>
    </UnverifiedEmailGate>
  );
}

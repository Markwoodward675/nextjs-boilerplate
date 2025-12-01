"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Card from "../../components/Card";
import WalletCard from "../../components/WalletCard";
import { fetchDashboardOverview } from "../../lib/api";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function DashboardPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    overview: null
  });

  const { data: marketData } = useSWR("/api/market", fetcher, {
    refreshInterval: 120_000
  });

  const topAssets = marketData?.assets?.slice(0, 3) || [];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const overview = await fetchDashboardOverview();
        if (mounted) {
          setState({ loading: false, error: "", overview });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load dashboard",
            overview: null
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, overview } = state;
  const user = overview?.user;
  const profile = overview?.profile;
  const wallets = overview?.wallets || [];
  const affiliate = overview?.affiliate;

  return (
    <main className="space-y-4 pb-10">
      {loading && <p className="text-xs text-slate-400">Loading dashboard…</p>}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {user && (
        <Card>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-xs text-slate-400">Account</div>
              <div className="text-sm font-semibold text-slate-100">
                {profile?.displayName || user.name || user.email}
              </div>
              <div className="text-[11px] text-slate-500">
                {user.email} ·{" "}
                {profile?.role ? profile.role.toUpperCase() : "USER"}
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              User ID:{" "}
              <span className="font-mono text-slate-400">{user.$id}</span>
            </div>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-slate-400">Portfolio overview</div>
          <div className="mt-2 text-2xl font-bold text-blue-300">
            Coming soon
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Connect balances and positions from brokers, exchanges, and wallets
            to see total exposure in one place.
          </p>
        </Card>
        <Card>
          <div className="text-xs text-slate-400">Risk & alerts</div>
          <div className="mt-2 text-sm text-slate-200">
            Set price alerts, track risk per trade, and keep position sizing
            under control.
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-400">Execution</div>
          <div className="mt-2 text-sm text-slate-200">
            Day Trader focuses on tools & tracking. Live trade execution happens
            with your own broker or exchange.
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-100">Wallets</h2>
            <span className="text-[11px] text-slate-500">
              {wallets.length} wallet(s)
            </span>
          </div>
          {wallets.length === 0 && (
            <p className="text-xs text-slate-500">
              No wallets found yet. After first login, Day Trader will create
              your main and affiliate wallets through Appwrite.
            </p>
          )}
          <div className="space-y-2">
            {wallets.map((w) => (
              <WalletCard key={w.$id} wallet={w} />
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Affiliate overview
            </h2>
            {affiliate?.code && (
              <span className="text-[11px] text-emerald-400">
                Code: <span className="font-mono">{affiliate.code}</span>
              </span>
            )}
          </div>
          {!affiliate && (
            <p className="text-xs text-slate-500">
              You don&apos;t have an affiliate account yet. You can add one in{" "}
              <span className="underline">Settings</span> and start earning
              commissions when traders join Day Trader from your links.
            </p>
          )}
          {affiliate && (
            <div className="space-y-1 text-xs text-slate-300">
              <p>
                Status:{" "}
                <span className="font-semibold">{affiliate.status}</span>
              </p>
              <p>
                Tier: <span className="font-semibold">{affiliate.tier}</span>
              </p>
              <p>
                Lifetime commission:{" "}
                <span className="font-semibold">
                  {affiliate.stats?.totalCommission?.toFixed(2) ?? "0.00"} USD
                </span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Use your code in URLs like:{" "}
                <span className="font-mono">
                  /auth/register?ref={affiliate.code}
                </span>{" "}
                to track new signups and commissions.
              </p>
            </div>
          )}
        </Card>
      </section>

      {topAssets.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topAssets.map((asset) => (
            <Card key={asset.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Market</div>
                  <div className="text-sm font-semibold text-slate-100">
                    {asset.name} ({asset.symbol})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Price</div>
                  <div className="text-sm font-semibold">
                    $
                    {asset.price?.toFixed
                      ? asset.price.toFixed(2)
                      : asset.price || "—"}
                  </div>
                  <div
                    className={`text-[11px] ${
                      (asset.percentChange24h ?? 0) >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {(asset.percentChange24h ?? 0) >= 0 ? "+" : ""}
                    {asset.percentChange24h?.toFixed
                      ? asset.percentChange24h.toFixed(2)
                      : "0.00"}
                    %
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}

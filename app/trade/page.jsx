"use client";

import useSWR from "swr";
import Card from "../../components/Card";
import TradeCard from "../../components/TradeCard";

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function TradePage() {
  const { data, error, isLoading } = useSWR("/api/market", fetcher, {
    refreshInterval: 60_000
  });

  const assets = data?.assets || [];

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Trading workspace
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Track key markets, prepare trades, and combine this data with your own
          broker or exchange. Day Trader shows market data and tools — trade
          execution is done externally.
        </p>
      </Card>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Live market overview
          </h2>
          {isLoading && (
            <span className="text-[11px] text-slate-500">
              Updating prices…
            </span>
          )}
          {error && (
            <span className="text-[11px] text-red-400">
              Couldn&apos;t load prices
            </span>
          )}
        </div>

        {assets.length === 0 && !isLoading && !error && (
          <Card>
            <p className="text-xs text-slate-400">
              No market data yet. Confirm your CoinMarketCap API key is set as{" "}
              <span className="font-mono text-[11px]">CMC_API_KEY</span> in
              Vercel and that the API endpoint is reachable.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {assets.slice(0, 9).map((asset) => (
            <TradeCard
              key={asset.id}
              symbol={asset.symbol}
              price={typeof asset.price === "number" ? asset.price : null}
              change={
                typeof asset.percentChange24h === "number"
                  ? asset.percentChange24h
                  : 0
              }
            />
          ))}
        </div>
      </section>
    </main>
  );
}

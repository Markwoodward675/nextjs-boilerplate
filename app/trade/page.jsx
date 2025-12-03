// app/trade/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserWallets } from "../../lib/api";

const PAIRS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XRP/USDT"];

export default function TradePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [pair, setPair] = useState("BTC/USDT");
  const [side, setSide] = useState("BUY");
  const [size, setSize] = useState("50");
  const [leverage, setLeverage] = useState("3");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/trade");
        return;
      }
      setUser(u);
      setChecking(false);
      try {
        const w = await getUserWallets(u.$id);
        if (!mounted) return;
        setWallets(w);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  const trading = wallets.find((w) => w.type === "trading");
  const tradingBalance = trading?.balance || 0;
  const numericSize = parseFloat(size || "0");
  const numericLev = parseFloat(leverage || "1");
  const notional = numericSize * numericLev;

  function handlePreviewOrder(e) {
    e.preventDefault();
    setMessage("");

    if (!numericSize || numericSize <= 0) {
      setMessage("Enter a valid trade size.");
      return;
    }

    if (numericSize > tradingBalance) {
      setMessage(
        "Insufficient trading wallet balance for this order size."
      );
      return;
    }

    setMessage(
      `${side} ${pair} with size ${numericSize.toFixed(
        2
      )} USD @ x${numericLev.toFixed(
        1
      )} leverage. Orders are tracked here, execution stays at your broker/exchange.`
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section className="grid gap-3 md:grid-cols-[2fr,3fr]">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Crypto trade ticket
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Simulate live crypto trades with real risk sizing based on your
            trading wallet. Execution is done with your own broker or
            exchange.
          </p>

          <form onSubmit={handlePreviewOrder} className="mt-3 space-y-2">
            <div className="text-[11px] text-slate-400">Symbol</div>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setSide("BUY")}
                className={`rounded-full px-3 py-2 border ${
                  side === "BUY"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                Long / Buy
              </button>
              <button
                type="button"
                onClick={() => setSide("SELL")}
                className={`rounded-full px-3 py-2 border ${
                  side === "SELL"
                    ? "border-red-500 bg-red-500/10 text-red-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                Short / Sell
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-400">
              Size (risk capital in USD)
            </div>
            <input
              type="number"
              min="0"
              step="10"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Trading wallet balance: {tradingBalance.toFixed(2)} USD
            </p>

            <div className="mt-2 text-[11px] text-slate-400">
              Leverage (x)
            </div>
            <input
              type="number"
              min="1"
              max="20"
              step="0.5"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Position notional: {isNaN(notional) ? "0.00" : notional.toFixed(2)} USD
            </p>

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-blue-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-blue-500"
            >
              Preview order
            </button>

            {message && (
              <p className="mt-2 text-[11px] text-emerald-300">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-2 text-[10px] text-red-400">
                Unable to load trading wallet: {error}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400">Price structure</div>
          <p className="mt-1 text-[11px] text-slate-400">
            Use this chart area conceptually: head &amp; shoulders, flags,
            triangles, and multi-bar pullbacks. Your execution plan should be
            written before you click buy or sell.
          </p>
          <div className="mt-3 h-52 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 relative overflow-hidden">
            {/* Fake chart primitives */}
            <div className="absolute inset-4 flex gap-1">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 flex items-end justify-center"
                >
                  <div
                    className="w-[3px] rounded-full bg-emerald-400/70"
                    style={{
                      height: `${20 + (Math.sin(i / 4) + 1) * 18}px`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="absolute inset-x-4 bottom-6 h-px bg-slate-700/70" />
            <div className="absolute left-6 top-6 h-24 w-24 rounded-full border border-slate-600/60" />
            <div className="absolute right-8 bottom-8 h-10 w-10 rotate-45 border border-blue-500/60" />
          </div>
        </Card>
      </section>
    </main>
  );
}

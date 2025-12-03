// app/giftcards/buy/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../../components/Card";
import { getCurrentUser, getUserWallets } from "../../../lib/api";

const BRANDS = ["Amazon", "PlayStation", "Steam"];

export default function GiftcardsBuyPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [brand, setBrand] = useState("Amazon");
  const [amount, setAmount] = useState("50");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/giftcards/buy");
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

  const main = wallets.find((w) => w.type === "main");
  const mainBalance = main?.balance || 0;
  const amt = parseFloat(amount || "0");

  function handlePreview(e) {
    e.preventDefault();
    setMessage("");

    if (!amt || amt <= 0) {
      setMessage("Enter a valid gift card amount.");
      return;
    }

    if (amt > mainBalance) {
      setMessage(
        "Insufficient main wallet balance to buy this gift card."
      );
      return;
    }

    setMessage(
      `Buying a ${brand} gift card worth $${amt.toFixed(
        2
      )} from your main wallet. Admin will process and send card details.`
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section className="grid gap-3 md:grid-cols-[2fr,3fr]">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Buy gift cards
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Convert a portion of your wallet balance into digital gift cards
            for spending, rewards, or controlled payouts.
          </p>

          <form onSubmit={handlePreview} className="mt-3 space-y-2">
            <div className="text-[11px] text-slate-400">Brand</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            >
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <div className="mt-2 text-[11px] text-slate-400">
              Amount (USD)
            </div>
            <input
              type="number"
              min="10"
              step="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Main wallet balance: {mainBalance.toFixed(2)} USD
            </p>

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-amber-500 px-4 py-2 text-[11px] font-medium text-slate-950 hover:bg-amber-400"
            >
              Preview purchase
            </button>

            {message && (
              <p className="mt-2 text-[11px] text-emerald-300">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-2 text-[10px] text-red-400">
                Unable to load wallet: {error}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Gift card ledger
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Gift card purchases will appear in Transactions with type
            GIFTCARD_BUY, allowing you to track how payouts are structured
            between cash, stablecoins, and gift cards.
          </p>
        </Card>
      </section>
    </main>
  );
}

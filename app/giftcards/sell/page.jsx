// app/giftcards/sell/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../../components/Card";
import { getCurrentUser } from "../../../lib/api";

export default function GiftcardsSellPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [brand, setBrand] = useState("Amazon");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("50");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/giftcards/sell");
        return;
      }
      setUser(u);
      setChecking(false);
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

  const amt = parseFloat(amount || "0");

  function handlePreview(e) {
    e.preventDefault();
    setMessage("");

    if (!code.trim()) {
      setMessage("Enter a valid gift card code.");
      return;
    }

    if (!amt || amt <= 0) {
      setMessage("Enter a valid gift card value.");
      return;
    }

    setMessage(
      `Submitting ${brand} gift card worth $${amt.toFixed(
        2
      )} for review. Admin will verify and credit your wallet if valid.`
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section className="grid gap-3 md:grid-cols-[2fr,3fr]">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Sell gift cards
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Submit unused gift cards for review. After verification, admin
            can credit equivalent value into your wallet.
          </p>

          <form onSubmit={handlePreview} className="mt-3 space-y-2">
            <div className="text-[11px] text-slate-400">Brand</div>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            >
              <option>Amazon</option>
              <option>PlayStation</option>
              <option>Steam</option>
            </select>

            <div className="mt-2 text-[11px] text-slate-400">
              Card code / number
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
              placeholder="XXXX-XXXX-XXXX"
            />

            <div className="mt-2 text-[11px] text-slate-400">
              Face value (USD)
            </div>
            <input
              type="number"
              min="10"
              step="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-amber-600 px-4 py-2 text-[11px] font-medium text-slate-950 hover:bg-amber-500"
            >
              Preview sale request
            </button>

            {message && (
              <p className="mt-2 text-[11px] text-emerald-300">
                {message}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Transaction preview
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Once admin verifies gift card validity and rate, an entry will be
            created in Transactions with type GIFTCARD_SELL and wallet
            credits applied.
          </p>
        </Card>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../../components/Card";
import { getCurrentUser } from "../../../lib/api";

export default function GiftcardsSellPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [unverified, setUnverified] = useState(false);
  const [user, setUser] = useState(null);

  const [brand, setBrand] = useState("Amazon");
  const [amount, setAmount] = useState("100");
  const [code, setCode] = useState("");
  const [imageName, setImageName] = useState("");

  // Email verification gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;

      if (!u) {
        router.replace("/auth/login?next=/giftcards/sell");
        return;
      }

      if (!u.emailVerification) {
        setUser(u);
        setUnverified(true);
        setChecking(false);
        return;
      }

      setUser(u);
      setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
    } else {
      setImageName("");
    }
  };

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  if (unverified) {
    return (
      <main className="px-4 pt-6 pb-24">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Verify your email to sell gift cards
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Once your email is verified, you&apos;ll be able to submit gift
            cards for review and payout.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section>
        <div className="text-[11px] text-slate-400 mb-1">
          Sell gift cards for wallet credit
        </div>
        <p className="text-[11px] text-slate-300">
          Submit unused or spare gift cards to convert them into wallet
          balance. Admin reviews every card before crediting funds to your main
          wallet.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-[3fr,2fr]">
        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Card details for review
          </div>
          <div className="space-y-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-0.5">
                Gift card brand
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              >
                <option>Amazon</option>
                <option>Apple</option>
                <option>Steam</option>
                <option>Google Play</option>
                <option>PlayStation</option>
                <option>Netflix</option>
                <option>Visa / MasterCard</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-0.5">
                Face value (USD)
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-0.5">
                PIN / code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
                placeholder="Enter the full redemption code"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-0.5">
                Card photo (front / back)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-[10px] text-slate-400"
              />
              {imageName && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {imageName}
                </p>
              )}
            </div>

            <button
              type="button"
              className="mt-2 w-full rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-100 font-semibold px-3 py-2"
            >
              Submit gift card sell request
            </button>

            <p className="mt-1 text-[10px] text-slate-500">
              Admin will validate the card, apply a rate, and credit your main
              wallet balance. If a card fails validation, it will be marked as
              rejected in your transaction notes.
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Convert unused value into capital
          </div>
          <p className="text-[11px] text-slate-300">
            Instead of letting gift cards sit, roll them into your trading
            business and put them to work inside a risk-managed plan.
          </p>
        </Card>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../../components/Card";
import { getCurrentUser, getUserWallets } from "../../../lib/api";

export default function GiftcardsBuyPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [unverified, setUnverified] = useState(false);
  const [user, setUser] = useState(null);

  const [wallets, setWallets] = useState([]);
  const [walletError, setWalletError] = useState("");

  const [brand, setBrand] = useState("Amazon");
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");

  // Email verification gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;

      if (!u) {
        router.replace("/auth/login?next=/giftcards/buy");
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

      try {
        const w = await getUserWallets(u.$id);
        if (!mounted) return;
        setWallets(w);
      } catch (err) {
        console.error(err);
        setWalletError(String(err.message || err));
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

  if (unverified) {
    return (
      <main className="px-4 pt-6 pb-24">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Verify your email to use gift cards
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Once your email is verified, you&apos;ll be able to buy and sell
            gift cards within Day Trader.
          </p>
        </Card>
      </main>
    );
  }

  const mainWallet = wallets.find((w) => w.type === "main");
  const mainBalance = mainWallet?.balance || 0;
  const numericAmount = Number(amount) || 0;
  const insufficient = numericAmount > mainBalance;

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section>
        <div className="text-[11px] text-slate-400 mb-1">
          Buy gift cards with wallet balance
        </div>
        <p className="text-[11px] text-slate-300">
          Convert a portion of your main wallet into gift cards for personal
          spend, controlled rewards, or payouts for yourself and your team.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-[3fr,2fr]">
        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Configure purchase
          </div>
          <div className="space-y-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-0.5">
                Main wallet balance
              </label>
              <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100">
                {mainBalance.toFixed(2)} USD
              </div>
            </div>

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
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-0.5">
                Purchase amount (USD)
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              />
              {insufficient && (
                <p className="mt-1 text-[10px] text-red-400">
                  Insufficient main wallet balance.
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-0.5">
                Internal note (optional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none resize-none"
                placeholder="Who or what is this gift card for?"
              />
            </div>

            <button
              type="button"
              className="mt-1 w-full rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-[11px] text-slate-950 font-semibold px-3 py-2"
            >
              Preview gift card purchase
            </button>
            <p className="mt-1 text-[10px] text-slate-500">
              Purchases are confirmed and fulfilled by admin. Wallet balances
              are only deducted when the gift card is issued.
            </p>
          </div>

          {walletError && (
            <p className="mt-3 text-[10px] text-red-400">
              Unable to load wallet: {walletError}
            </p>
          )}
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Payouts with intention
          </div>
          <p className="text-[11px] text-slate-300">
            Gift cards are a clean way to reward yourself or your circle without
            blurring trading capital with lifestyle expenses. Allocate,
            withdraw, and reward on purpose.
          </p>
        </Card>
      </section>
    </main>
  );
}

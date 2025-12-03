// app/withdraw/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserWallets } from "../../lib/api";

export default function WithdrawPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("50");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/withdraw");
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
      setMessage("Enter a valid withdrawal amount.");
      return;
    }

    if (amt > mainBalance) {
      setMessage(
        "Insufficient main wallet balance for this withdrawal request."
      );
      return;
    }

    setMessage(
      `Requesting ${method === "bank" ? "bank" : "crypto"} withdrawal of $${amt.toFixed(
        2
      )}. Admin will review and process payouts according to your plan.`
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section className="grid gap-3 md:grid-cols-[2fr,3fr]">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Withdraw funds
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Move capital out of Day Trader wallets to your own bank,
            exchange, or stablecoin addresses as part of a structured risk
            and payout plan.
          </p>

          <form onSubmit={handlePreview} className="mt-3 space-y-2">
            <div className="text-[11px] text-slate-400">
              Withdrawal method
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setMethod("bank")}
                className={`rounded-full px-3 py-2 border ${
                  method === "bank"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                    : "border-slate-700 text-slate-200"
                }`}
              >
                Bank / Fiat
              </button>
              <button
                type="button"
                onClick={() => setMethod("crypto")}
                className={`rounded-full px-3 py-2 border ${
                  method === "crypto"
                    ? "border-blue-500 bg-blue-500/10 text-blue-200"
                    : "border-slate-700 text-slate-200"
                }`}
              >
                Crypto / Stablecoin
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-400">
              Amount (USD)
            </div>
            <input
              type="number"
              min="0"
              step="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Main wallet balance: {mainBalance.toFixed(2)} USD
            </p>

            <div className="mt-2 text-[11px] text-slate-400">
              Notes for admin (optional)
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none"
              placeholder="Payout preference, account reference, or any detail that helps review."
            />

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-red-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-red-500"
            >
              Preview withdrawal request
            </button>

            {message && (
              <p className="mt-2 text-[11px] text-emerald-300">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-2 text-[10px] text-red-400">
                Unable to load wallets: {error}
              </p>
            )}
          </form>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Withdrawal cadence
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Decide in advance how often you pay yourself—weekly, biweekly, or
            monthly—and how much of your profits get pulled out versus left
            in the system.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Use withdrawals to reward discipline, not only big wins. Lock in
            positive months instead of giving them back during emotional
            overtrading.
          </p>
        </Card>
      </section>
    </main>
  );
}

// app/invest/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserWallets } from "../../lib/api";

const PLANS = [
  { id: "novice", name: "Novice / Starter", min: 200, max: 999, roi: 3 },
  { id: "standard", name: "Standard", min: 1000, max: 4999, roi: 5 },
  { id: "elite", name: "Elite", min: 5000, max: 9999, roi: 7 },
];

export default function InvestPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [amount, setAmount] = useState("200");
  const [days, setDays] = useState("30");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/invest");
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
  const d = parseInt(days || "1", 10) || 1;

  const totalRoiPercent = selectedPlan.roi; // for the chosen horizon (default 30d)
  const totalReturn = (amt * totalRoiPercent) / 100;
  const dailyReturn = totalReturn / d;

  function handlePlanChange(planId) {
    const p = PLANS.find((pl) => pl.id === planId) || PLANS[0];
    setSelectedPlan(p);
    setAmount(String(p.min));
  }

  function handlePreview(e) {
    e.preventDefault();
    setMessage("");

    if (!amt || amt <= 0) {
      setMessage("Enter a valid allocation amount.");
      return;
    }

    if (amt < selectedPlan.min || amt > selectedPlan.max) {
      setMessage(
        `Amount must be between $${selectedPlan.min.toFixed(
          2
        )} and $${selectedPlan.max.toFixed(2)} for this plan.`
      );
      return;
    }

    if (amt > mainBalance) {
      setMessage(
        "Insufficient main wallet balance. Fund your wallet or lower the allocation."
      );
      return;
    }

    setMessage(
      `Allocating $${amt.toFixed(
        2
      )} into ${selectedPlan.name}. Approx daily return: $${dailyReturn.toFixed(
        2
      )} over ${d} day(s). Actual credited returns remain admin-controlled.`
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section className="grid gap-3 md:grid-cols-[2fr,3fr]">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Investment plans
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Allocate a portion of your main wallet to structured plans with
            clear ranges and target ROIs. Capital is debited from the main
            wallet; returns are tracked in an admin-controlled balance.
          </p>

          <form onSubmit={handlePreview} className="mt-3 space-y-2">
            <div className="text-[11px] text-slate-400">Select plan</div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanChange(plan.id)}
                  className={`rounded-2xl px-3 py-2 border text-left ${
                    plan.id === selectedPlan.id
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 text-slate-200"
                  }`}
                >
                  <div className="font-semibold">{plan.name}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    ${plan.min} – ${plan.max}
                  </div>
                  <div className="mt-0.5 text-[10px]">
                    Target ROI: {plan.roi}% (total)
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 text-[11px] text-slate-400">
              Amount to allocate (USD)
            </div>
            <input
              type="number"
              min={selectedPlan.min}
              max={selectedPlan.max}
              step="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Main wallet balance: {mainBalance.toFixed(2)} USD
            </p>

            <div className="mt-2 text-[11px] text-slate-400">
              Duration (days)
            </div>
            <input
              type="number"
              min="1"
              max="60"
              step="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
            />

            <div className="mt-2 rounded-xl bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-[11px] text-slate-300">
              <div>
                Est. total return:{" "}
                <span className="font-semibold">
                  ${isNaN(totalReturn) ? "0.00" : totalReturn.toFixed(2)}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                Approx ROI per day:{" "}
                <span className="font-semibold">
                  $
                  {isNaN(dailyReturn)
                    ? "0.00"
                    : dailyReturn.toFixed(2)}
                </span>{" "}
                ({(totalRoiPercent / d).toFixed(3)}% / day)
              </div>
            </div>

            <button
              type="submit"
              className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-emerald-500"
            >
              Preview allocation
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
            How returns are handled
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Day Trader treats investment returns as an admin-controlled
            stream. That means you can calculate and preview expected
            outcomes, but final credited returns and timing are manually
            managed by the admin team.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Once live crediting is connected, returns can be moved into your
            main or trading wallets and shown as a separate &quot;investment
            returns&quot; balance.
          </p>
        </Card>
      </section>
    </main>
  );
}

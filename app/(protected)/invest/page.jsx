"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import AvatarModal from "../../../components/AvatarModal";
import AppShellPro from "../../../components/AppShellPro";
import MarketPanel from "../../../components/MarketPanel";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getUserProfile,
  createInvestment,
} from "../../../lib/api";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const PLANS = [
  { key: "novice", name: "Novice", min: 250, max: 999 },
  { key: "standard", name: "Standard", min: 1000, max: 4999 },
  { key: "elite", name: "Elite", min: 5000, max: 9999 },
];

export default function InvestPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs] = useState([]);

  const [planKey, setPlanKey] = useState("novice");
  const plan = useMemo(() => PLANS.find((p) => p.key === planKey) || PLANS[0], [planKey]);

  const [amount, setAmount] = useState(String(plan.min));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setAmount(String(plan.min));
  }, [plan.min, planKey]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;
        setMe(u);

        const [p, ws, t] = await Promise.all([
          getUserProfile(u.$id).catch(() => null),
          getUserWallets(u.$id),
          getUserTransactions(u.$id),
        ]);

        if (!cancel) {
          setProfile(p);
          setWallets(ws || []);
          setTxs(t || []);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load investments.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  const main = useMemo(() => (wallets || []).find((w) => w.currencyType === "main") || null, [wallets]);

  const investRows = useMemo(
    () => (txs || []).filter((t) => t.category === "invest" || t.type === "invest").slice(0, 20),
    [txs]
  );

  const metrics = [
    { label: "Main", value: money(main?.balance), sub: "Balance" },
    { label: "Plan", value: plan.name, sub: `${money(plan.min)} – ${money(plan.max)}` },
    { label: "Positions", value: String(investRows.length), sub: "Recent" },
    { label: "Status", value: err ? "Degraded" : "Normal", sub: err ? "Error" : "Operational" },
  ];

  const submit = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const a = Number(amount);
      if (!Number.isFinite(a)) throw new Error("Invalid amount");
      if (a < plan.min || a > plan.max) throw new Error(`Amount must be between ${money(plan.min)} and ${money(plan.max)}`);
      await createInvestment(me.$id, { plan: plan.key, amount: a });
      setOk("Investment placed.");
    } catch (e) {
      setErr(e?.message || "Unable to place investment.");
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <AppShellPro rightSlot={<AvatarModal profile={profile} />}>
      <UnverifiedEmailGate>
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">Invest</h1>
              <p className="text-sm text-slate-400">Plan selection and position history.</p>
            </div>
            <div className="w-full lg:w-[420px]">
              <MarketPanel kind="crypto" symbol="BTC" />
            </div>
          </div>

          {err ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {err}
            </div>
          ) : null}
          {ok ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {ok}
            </div>
          ) : null}

          <MetricStrip items={metrics} />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-sm font-semibold text-slate-200">Place Investment</div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Plan</div>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                  value={planKey}
                  onChange={(e) => setPlanKey(e.target.value)}
                >
                  {PLANS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.min}-{p.max})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Amount (USD)</div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Locked: {money(plan.min)} – {money(plan.max)}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submit}
                  className="w-full rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
                >
                  {busy ? "Processing…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>

          <BlotterTable title="Investments" rows={investRows} />
        </div>
      </UnverifiedEmailGate>
    </AppShellPro>
  );
}

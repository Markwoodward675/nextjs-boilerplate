"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import BlotterTable from "../../../components/BlotterTable";
import AvatarModal from "../../../components/AvatarModal";
import AppShellPro from "../../../components/AppShellPro";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getUserProfile,
  createWithdrawal,
} from "../../../lib/api";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United States", "United Kingdom", "Canada"];

export default function WithdrawPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [method, setMethod] = useState("");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("100");
  const [details, setDetails] = useState({ bankName: "", accountName: "", accountNumber: "", cryptoAddress: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

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
        if (!cancel) setErr(e?.message || "Unable to load withdrawals.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const main = useMemo(() => (wallets || []).find((w) => w.currencyType === "main") || null, [wallets]);
  const withdrawRows = useMemo(
    () => (txs || []).filter((t) => t.category === "withdraw" || t.type === "withdraw").slice(0, 25),
    [txs]
  );

  const metrics = [
    { label: "Main", value: money(main?.balance), sub: "Balance" },
    { label: "Requests", value: String(withdrawRows.length), sub: "Recent" },
    { label: "Method", value: method || "—", sub: "Selection" },
    { label: "Status", value: err ? "Degraded" : "Normal", sub: err ? "Error" : "Operational" },
  ];

  const submit = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) throw new Error("Invalid amount");
      if (!method) throw new Error("Select a withdrawal method");
      if (!country) throw new Error("Select a country");

      const payload = {
        method,
        country,
        amount: a,
        details,
      };

      await createWithdrawal(me.$id, payload);
      setOk("Withdrawal submitted.");
    } catch (e) {
      setErr(e?.message || "Unable to submit withdrawal.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>;
  if (!me) return null;

  return (
    <AppShellPro rightSlot={<AvatarModal profile={profile} />}>
      <UnverifiedEmailGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Withdraw</h1>
            <p className="text-sm text-slate-400">Create a withdrawal request.</p>
          </div>

          {err ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{err}</div>
          ) : null}
          {ok ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">{ok}</div>
          ) : null}

          <MetricStrip items={metrics} />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-sm font-semibold text-slate-200">New Withdrawal</div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Method</div>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    setCountry("");
                    setDetails({ bankName: "", accountName: "", accountNumber: "", cryptoAddress: "" });
                  }}
                >
                  <option value="">Select…</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Country</div>
                <select
                  disabled={!method}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40 disabled:opacity-60"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
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
              </div>
            </div>

            {/* Details form */}
            {method && country ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold text-slate-200">Withdrawal Details</div>

                {method === "bank_transfer" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input
                      placeholder="Bank name"
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                      value={details.bankName}
                      onChange={(e) => setDetails((d) => ({ ...d, bankName: e.target.value }))}
                    />
                    <input
                      placeholder="Account name"
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                      value={details.accountName}
                      onChange={(e) => setDetails((d) => ({ ...d, accountName: e.target.value }))}
                    />
                    <input
                      placeholder="Account number"
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                      value={details.accountNumber}
                      onChange={(e) => setDetails((d) => ({ ...d, accountNumber: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      placeholder="Wallet address"
                      className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                      value={details.cryptoAddress}
                      onChange={(e) => setDetails((d) => ({ ...d, cryptoAddress: e.target.value }))}
                    />
                    <div className="text-xs text-slate-500 flex items-center">
                      Network and asset are validated in processing.
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={submit}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
                  >
                    {busy ? "Submitting…" : "Submit withdrawal"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <BlotterTable title="Withdrawals" rows={withdrawRows} />
        </div>
      </UnverifiedEmailGate>
    </AppShellPro>
  );
}

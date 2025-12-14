"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import MarketPanel from "../../../components/MarketPanel";
import { getCurrentUser, getUserWallets } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function DepositPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [amount, setAmount] = useState("100");
  const [payCurrency, setPayCurrency] = useState("usdttrc20");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [lastInvoiceUrl, setLastInvoiceUrl] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      if (cancel) return;
      setMe(u);
      setWallets((await getUserWallets(u.$id)) || []);
    })();
    return () => { cancel = true; };
  }, [router]);

  const main = useMemo(() => (wallets || []).find((w) => w.currencyType === "main") || null, [wallets]);

  const metrics = [
    { label: "Main Balance", value: money(main?.balance), sub: "wallet: main" },
    { label: "Method", value: "NOWPayments", sub: "invoice flow" },
    { label: "Pay Currency", value: payCurrency.toUpperCase(), sub: "selection" },
    { label: "Invoice State", value: busy ? "Processing" : "Ready", sub: "server route" },
  ];

  const createInvoice = async () => {
    setBusy(true);
    setErr("");
    setLastInvoiceUrl("");
    try {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Invalid amount");

      const r = await fetch("/api/nowpayments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          price_amount: amt,
          price_currency: "usd",
          pay_currency: payCurrency,
          order_id: `dt_${me.$id}_${Date.now()}`,
        }),
      });

      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || "Invoice creation failed");

      const url = j?.invoice?.invoice_url;
      if (!url) throw new Error("NOWPayments: invoice_url missing");

      setLastInvoiceUrl(url);
      window.location.href = url;
    } catch (e) {
      setErr(e?.message || "Funding failed");
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div>
            <h1 className="text-2xl font-semibold">Funding</h1>
            <p className="text-sm text-slate-400">
              Create an invoice and route settlement through IPN (webhook) into wallet crediting.
            </p>
          </div>
          <div className="w-full lg:w-[420px]">
            <MarketPanel kind="crypto" symbol="USDT" />
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-200">Create Invoice</div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Amount (USD)</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
              />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Pay currency</div>
              <select
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                value={payCurrency}
                onChange={(e) => setPayCurrency(e.target.value)}
              >
                <option value="usdttrc20">USDT (TRC20)</option>
                <option value="usdtbsc">USDT (BSC)</option>
                <option value="btc">BTC</option>
                <option value="eth">ETH</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={busy}
                onClick={createInvoice}
                className="w-full rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
              >
                {busy ? "Creating…" : "Generate invoice"}
              </button>
            </div>
          </div>

          {lastInvoiceUrl ? (
            <div className="mt-3 text-xs text-slate-400">
              Invoice URL: <span className="text-slate-200 break-all">{lastInvoiceUrl}</span>
            </div>
          ) : null}

          <div className="mt-3 text-xs text-slate-500">
            IPN route is configured at <span className="text-slate-300">/api/nowpayments/ipn</span>. Next step: verify signature + credit wallet on <span className="text-slate-300">payment_status=finished</span>.
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

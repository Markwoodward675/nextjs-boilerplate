"use client";

import { useState } from "react";
import Card from "../../components/Card";

export default function DepositPage() {
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("USD");
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [error, setError] = useState("");

  async function handleCreateNowPaymentsInvoice(e) {
    e.preventDefault();
    setError("");
    setInvoiceUrl("");
    setLoading(true);

    try {
      const res = await fetch("/api/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create invoice");
      }

      if (data?.invoice_url) {
        setInvoiceUrl(data.invoice_url);
      } else {
        throw new Error("NOWPayments did not return an invoice URL");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to create NOWPayments invoice.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Deposit funds
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Add funds to your Day Trader wallets using crypto payments via
          NOWPayments, bank or card top-ups, or gift cards.
        </p>
      </Card>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* NOWPayments primary method */}
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Crypto deposit via NOWPayments
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Generate a secure invoice through NOWPayments and fund your wallet
            with supported cryptocurrencies. Your deposit will be credited to
            your USD wallet after confirmation.
          </p>

          <form
            onSubmit={handleCreateNowPaymentsInvoice}
            className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
          >
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="NGN">NGN</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-emerald-600 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-500 disabled:opacity-60"
              >
                {loading ? "Creating invoice…" : "Generate deposit link"}
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-3 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {invoiceUrl && (
            <div className="mt-3 text-xs text-emerald-400">
              <p className="mb-1">Invoice created successfully.</p>
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-medium text-slate-900 hover:bg-white"
              >
                Open NOWPayments invoice
              </a>
              <p className="mt-1 text-[10px] text-slate-500">
                Complete the payment in your crypto wallet. Your Day Trader
                wallet will be credited after blockchain confirmation.
              </p>
            </div>
          )}
        </Card>

        {/* Other deposit methods cards */}
        <div className="space-y-3">
          <Card>
            <h3 className="text-xs font-semibold text-slate-100">
              Bank & card funding
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Add bank or card top-ups as additional funding rails. Connect
              providers that match your region and compliance requirements.
            </p>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-slate-100">
              Gift cards
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Use gift cards as an alternative way to fund your account. Go to{" "}
              <span className="underline decoration-slate-600">
                Gift Cards
              </span>{" "}
              to buy or sell supported brands.
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}

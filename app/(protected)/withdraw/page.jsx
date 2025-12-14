"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserProfile, createWithdrawalRequest } from "../../../lib/api";

const countries = ["Nigeria", "Ghana", "Kenya", "South Africa", "United States", "United Kingdom"];

export default function WithdrawPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [method, setMethod] = useState("bank");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("");

  // dynamic fields
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");
  const [walletAddress, setWalletAddress] = useState("");

  const [mobileProvider, setMobileProvider] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      const p = await getUserProfile(u.$id).catch(() => null);

      if (!cancel) {
        setMe(u);
        setProfile(p);
        // lock country from profile if present
        if (p?.country) setCountry(p.country);
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const methodTitle = useMemo(() => {
    if (method === "bank") return "Bank Transfer";
    if (method === "crypto") return "Crypto Transfer";
    return "Mobile Money";
  }, [method]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount.");
      if (!country) throw new Error("Select a country.");

      const payload = {
        method,
        country,
        amount: amt,
        details:
          method === "bank"
            ? { bankName, accountName, accountNumber }
            : method === "crypto"
            ? { cryptoNetwork, walletAddress }
            : { mobileProvider, mobileNumber },
      };

      const res = await createWithdrawalRequest(me.$id, payload);
      setOk("Withdrawal request submitted.");
      setAmount("");
    } catch (e) {
      setErr(e?.message || "Unable to submit withdrawal.");
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Withdraw</h1>
          <p className="text-sm text-slate-400">Submit a withdrawal request.</p>
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 lg:col-span-1">
            <div className="text-sm font-semibold text-slate-100">Method</div>

            <div className="mt-3 space-y-2">
              {[
                { v: "bank", t: "Bank Transfer" },
                { v: "crypto", t: "Crypto Transfer" },
                { v: "mobile", t: "Mobile Money" },
              ].map((m) => (
                <button
                  key={m.v}
                  onClick={() => setMethod(m.v)}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    method === m.v
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                      : "border-slate-800 bg-slate-950/20 text-slate-200 hover:bg-slate-900/50",
                  ].join(" ")}
                >
                  {m.t}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-100">{methodTitle}</div>
                <div className="text-xs text-slate-500">Fill in the required details.</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Country</div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/40"
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Amount</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500/40"
                />
              </div>
            </div>

            {/* Dynamic forms */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {method === "bank" ? (
                <>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Bank name</div>
                    <input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Account name</div>
                    <input
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Account number</div>
                    <input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                </>
              ) : null}

              {method === "crypto" ? (
                <>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Network</div>
                    <select
                      value={cryptoNetwork}
                      onChange={(e) => setCryptoNetwork(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    >
                      <option value="TRC20">TRC20</option>
                      <option value="ERC20">ERC20</option>
                      <option value="BEP20">BEP20</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Wallet address</div>
                    <input
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                </>
              ) : null}

              {method === "mobile" ? (
                <>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Provider</div>
                    <input
                      value={mobileProvider}
                      onChange={(e) => setMobileProvider(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-slate-500">Mobile number</div>
                    <input
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                disabled={busy}
                onClick={submit}
                className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
              >
                {busy ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

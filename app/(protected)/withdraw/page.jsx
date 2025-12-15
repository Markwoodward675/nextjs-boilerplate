"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, createTransaction, createAlert } from "../../../lib/api";

export default function WithdrawPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [method, setMethod] = useState("bank");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState({});
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const b = await ensureUserBootstrap().catch(() => null);
      if (!b) return router.replace("/signin");
      if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
      if (!c) {
        setBoot(b);
        setCountry(b.profile.country || "");
      }
    })();
    return () => (c = true);
  }, [router]);

  const showBank = useMemo(() => method === "bank" && country, [method, country]);
  const showCrypto = useMemo(() => method === "crypto" && country, [method, country]);

  const submit = async () => {
    if (!boot) return;
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("Enter a valid amount.");
      if (!country) throw new Error("Select a country.");

      await createTransaction(boot.user.$id, {
        type: "withdrawal",
        amount: amt,
        status: "pending",
        meta: { method, country, details },
      });

      await createAlert(boot.user.$id, {
        title: "Withdrawal request submitted",
        body: "Your request is pending review.",
        kind: "info",
      });

      setOk("Withdrawal request submitted.");
      setAmount("");
      setDetails({});
    } catch (e) {
      setErr(e?.message || "Unable to submit withdrawal.");
    } finally {
      setBusy(false);
    }
  };

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Withdraw</div>
        <div className="cardSub">Submit a withdrawal request for review.</div>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Method</div>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="bank">Bank transfer</option>
            <option value="crypto">Crypto</option>
          </select>
        </div>

        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Country</div>
          <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
        </div>

        <div>
          <div className="cardSub" style={{ marginBottom: 6 }}>Amount (USD)</div>
          <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>

        {showBank ? (
          <>
            <div className="cardTitle" style={{ fontSize: 13 }}>Bank details</div>
            <input className="input" placeholder="Account name" onChange={(e) => setDetails({ ...details, accountName: e.target.value })} />
            <input className="input" placeholder="Account number" onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })} />
            <input className="input" placeholder="Bank name" onChange={(e) => setDetails({ ...details, bankName: e.target.value })} />
          </>
        ) : null}

        {showCrypto ? (
          <>
            <div className="cardTitle" style={{ fontSize: 13 }}>Crypto details</div>
            <input className="input" placeholder="Network (e.g. TRC20)" onChange={(e) => setDetails({ ...details, network: e.target.value })} />
            <input className="input" placeholder="Wallet address" onChange={(e) => setDetails({ ...details, address: e.target.value })} />
          </>
        ) : null}

        <button className="btnPrimary" onClick={submit} disabled={busy}>
          {busy ? "Submitting…" : "Submit withdrawal"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, getUserTransactions } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function TransactionsPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    let c = false;
    (async () => {
      const b = await ensureUserBootstrap().catch(() => null);
      if (!b) return router.replace("/signin");
      if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
      const t = await getUserTransactions(b.user.$id);
      if (!c) {
        setBoot(b);
        setTxs(t);
      }
    })();
    return () => (c = true);
  }, [router]);

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Transactions</div>
        <div className="cardSub">Deposits, withdrawals, investments, and system entries.</div>
      </div>

      <div className="card">
        {txs.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {txs.map((t) => (
              <div key={t.$id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div className="cardTitle" style={{ fontSize: 13 }}>{t.type || "Transaction"}</div>
                  <div className="cardSub">{new Date(t.createdAt || t.$createdAt).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="cardTitle" style={{ fontSize: 13 }}>{money(t.amount)}</div>
                  <div className="cardSub">{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cardSub">No transactions available.</div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap } from "../../../lib/api";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function WalletPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const b = await ensureUserBootstrap().catch(() => null);
      if (!b) return router.replace("/signin");
      if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
      if (!c) setBoot(b);
    })();
    return () => (c = true);
  }, [router]);

  const totals = useMemo(() => {
    const map = { main: 0, trading: 0, affiliate: 0 };
    (boot?.wallets || []).forEach((w) => {
      map[w.currencyType] = Number(w.balance || 0);
    });
    return map;
  }, [boot?.wallets]);

  const combined = totals.main + totals.trading + totals.affiliate;

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Wallet</div>
        <div className="cardSub">Balances and positions overview.</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="cardSub">Total balance</div>
        <div className="cardTitle" style={{ fontSize: 22 }}>{money(combined)}</div>
        <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div className="card">
            <div className="cardSub">Main</div>
            <div className="cardTitle">{money(totals.main)}</div>
          </div>
          <div className="card">
            <div className="cardSub">Trading</div>
            <div className="cardTitle">{money(totals.trading)}</div>
          </div>
          <div className="card">
            <div className="cardSub">Affiliate</div>
            <div className="cardTitle">{money(totals.affiliate)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

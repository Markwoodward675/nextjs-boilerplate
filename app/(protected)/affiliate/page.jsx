"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureUserBootstrap, ensureAffiliateAccount, getAffiliateSummary } from "../../../lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [summary, setSummary] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      const b = await ensureUserBootstrap().catch(() => null);
      if (!b) return router.replace("/signin");
      if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
      await ensureAffiliateAccount(b.user.$id);
      const s = await getAffiliateSummary(b.user.$id);
      if (!c) {
        setBoot(b);
        setSummary(s);
      }
    })();
    return () => (c = true);
  }, [router]);

  const refLink = useMemo(() => {
    if (!summary?.affiliateId) return "";
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    return `${base}/signup?ref=${summary.affiliateId}`;
  }, [summary?.affiliateId]);

  if (!boot || !summary) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Affiliate</div>
        <div className="cardSub">Referral tracking and commission records.</div>
      </div>

      {msg ? <div className="flashOk">{msg}</div> : null}

      <div className="card">
        <div className="cardTitle" style={{ fontSize: 13 }}>Referral ID</div>
        <div className="cardSub" style={{ marginTop: 6 }}>{summary.affiliateId}</div>

        <div className="cardTitle" style={{ fontSize: 13, marginTop: 12 }}>Referral link</div>
        <div className="cardSub" style={{ marginTop: 6, wordBreak: "break-all" }}>{refLink}</div>

        <button
          className="btnPrimary"
          style={{ marginTop: 10 }}
          onClick={async () => {
            await navigator.clipboard.writeText(refLink);
            setMsg("Referral link copied.");
            setTimeout(() => setMsg(""), 2500);
          }}
        >
          Copy link
        </button>
      </div>

      <div className="card">
        <div className="cardTitle">Commissions</div>
        {summary.commissions?.length ? (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {summary.commissions.map((c) => (
              <div key={c.$id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div className="cardTitle" style={{ fontSize: 13 }}>${Number(c.commissionAmount || 0).toFixed(2)}</div>
                  <div className="cardSub">{c.paymentStatus}</div>
                </div>
                <div className="cardSub">{new Date(c.commissionDate || c.$createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cardSub" style={{ marginTop: 8 }}>No commissions recorded.</div>
        )}
      </div>

      <div className="card">
        <div className="cardTitle">Referrals</div>
        {summary.referrals?.length ? (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {summary.referrals.map((r) => (
              <div key={r.$id} className="card">
                <div className="cardTitle" style={{ fontSize: 13 }}>{r.status}</div>
                <div className="cardSub">User: {String(r.referredUserId)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cardSub" style={{ marginTop: 8 }}>No referrals recorded.</div>
        )}
      </div>
    </div>
  );
}

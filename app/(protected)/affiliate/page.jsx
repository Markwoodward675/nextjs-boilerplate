"use client";

import { useEffect, useMemo, useState } from "react";
import { Query } from "appwrite";
import { db, DB_ID, COL, errMsg, requireSession } from "../../../lib/appwriteClient";

export default function AffiliatePage() {
  const [user, setUser] = useState(null);
  const [acc, setAcc] = useState(null);
  const [refs, setRefs] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);

        // affiliate_account uses userId + affiliateId (int)
        const aRes = await db.listDocuments(DB_ID, COL.AFF_ACCOUNT, [
          Query.equal("userId", u.$id),
          Query.limit(1),
        ]);

        const account = aRes.documents?.[0] || null;
        setAcc(account);

        if (account?.affiliateId != null) {
          const r = await db.listDocuments(DB_ID, COL.AFF_REFERRALS, [
            Query.equal("referrerAffiliateId", Number(account.affiliateId)),
            Query.orderDesc("referralDate"),
            Query.limit(200),
          ]);
          setRefs(r.documents || []);
        }
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load affiliate data."));
      }
    })();
    return () => (dead = true);
  }, []);

  const referralLink = useMemo(() => {
    if (!acc?.affiliateId) return "";
    return `${window.location.origin}/signup?ref=${encodeURIComponent(acc.affiliateId)}`;
  }, [acc?.affiliateId]);

  const copy = async () => {
    setMsg("");
    setErr("");
    try {
      await navigator.clipboard.writeText(referralLink);
      setMsg("Referral link copied.");
    } catch {
      setErr("Copy failed. Select and copy manually.");
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Affiliate</div>
        <div className="dt-subtle">Copy your referral link. Referred signups will appear here.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div className="dt-card" style={{ marginTop: 14 }}>
        {!acc ? (
          <div className="dt-subtle">
            No affiliate account found. Create it in Admin Panel for this user (affiliate_account).
          </div>
        ) : (
          <>
            <div className="dt-grid">
              <div className="dt-card dt-card-inner">
                <div className="dt-k">Affiliate ID</div>
                <div className="dt-money">{acc.affiliateId}</div>
              </div>
              <div className="dt-card dt-card-inner">
                <div className="dt-k">Total Earned</div>
                <div className="dt-money">${Number(acc.totalEarned || 0).toLocaleString()}</div>
              </div>
              <div className="dt-card dt-card-inner">
                <div className="dt-k">Status</div>
                <div className="dt-money">{String(acc.status || "active")}</div>
              </div>
            </div>

            <div className="dt-form" style={{ marginTop: 12 }}>
              <label className="dt-label">Your referral link</label>
              <input className="dt-input" value={referralLink} readOnly />
              <button className="dt-btn dt-btn-primary" onClick={copy} disabled={!referralLink}>
                Copy link
              </button>
            </div>
          </>
        )}
      </div>

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-h3">Referred users</div>
        {refs?.length ? (
          <div className="dt-list" style={{ marginTop: 8 }}>
            {refs.map((r) => (
              <div key={r.$id} className="dt-row">
                <div>
                  <div className="dt-row-title">Referred User ID: {r.referredUserId || "—"}</div>
                  <div className="dt-row-sub">
                    {r.referralDate ? new Date(r.referralDate).toLocaleString() : "—"} • {r.status || "pending"}
                  </div>
                </div>
                <div className="dt-row-right">
                  <div className="dt-row-amt">${Number(r.commissionEarned || 0).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dt-subtle" style={{ marginTop: 8 }}>No referrals yet.</div>
        )}
      </div>
    </div>
  );
}

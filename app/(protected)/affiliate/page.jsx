"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import { getCurrentUser, getAffiliateOverview } from "../../../lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [data, setData] = useState({ affiliateId: null, referrals: [], commissions: [] });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;
        setMe(u);

        const o = await getAffiliateOverview().catch(() => ({ affiliateId: null, referrals: [], commissions: [] }));
        if (!cancel) setData(o);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load affiliate module.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const metrics = [
    { label: "Affiliate ID", value: data?.affiliateId ?? "—", sub: "tracking key" },
    { label: "Referrals", value: String(data?.referrals?.length || 0), sub: "count" },
    { label: "Commissions", value: String(data?.commissions?.length || 0), sub: "records" },
    { label: "State", value: err ? "Degraded" : "Normal", sub: err ? "source error" : "ok" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading affiliate…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate Performance</h1>
          <p className="text-sm text-slate-400">Referral analytics and commission tracking (read-only).</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-200">Referral Link</div>
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-200 break-all">
            {typeof window !== "undefined"
              ? `${window.location.origin}/signup?ref=${data?.affiliateId ?? "YOUR_ID"}`
              : `/signup?ref=${data?.affiliateId ?? "YOUR_ID"}`}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Note: Your affiliate tables currently use numeric IDs in places. Normalize to string user IDs before writing.
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

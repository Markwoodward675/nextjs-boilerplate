"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import { getCurrentUser, ensureAffiliateAccount, getAffiliateSummary } from "../../../lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        setMe(u);

        await ensureAffiliateAccount(u.$id);
        const s = await getAffiliateSummary(u.$id);

        if (!cancel) setSummary(s);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load affiliate.");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const referralLink = useMemo(() => {
    if (!summary?.affiliateId) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/signup?ref=${summary.affiliateId}`;
  }, [summary?.affiliateId]);

  const copy = async () => {
    setErr("");
    setOk("");
    try {
      await navigator.clipboard.writeText(referralLink);
      setOk("Copied.");
    } catch {
      setErr("Copy failed.");
    }
  };

  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Affiliate</h1>
          <p className="text-sm text-slate-400">Commissions and referrals.</p>
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
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-500">Affiliate ID</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {summary?.affiliateId ?? "—"}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-500">Total Earned</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              ${Number(summary?.totalEarned || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-500">Referrals</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">
              {summary?.referralsCount ?? 0}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-sm font-semibold text-slate-100">Referral link</div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={referralLink}
              readOnly
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
            />
            <button
              onClick={copy}
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
          <div className="text-sm font-semibold text-slate-100">Recent commissions</div>
          <div className="mt-3 space-y-2">
            {(summary?.commissions || []).length ? (
              summary.commissions.map((c) => (
                <div
                  key={c.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-100">
                      ${Number(c.commissionAmount || 0).toLocaleString()} {c.commissionCurrency || "USD"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(c.commissionDate || c.$createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{c.paymentStatus || "pending"}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400">No commissions yet.</div>
            )}
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

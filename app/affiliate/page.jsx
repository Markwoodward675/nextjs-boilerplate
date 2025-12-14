"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { getCurrentUser, getAffiliateOverview, getAffiliateAccount } from "../../lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState({ referrals: [], commissions: [], affiliateId: null });
  const [acct, setAcct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancelled) return;

        setUser(u);

        const [a, o] = await Promise.all([
          getAffiliateAccount().catch(() => null),
          getAffiliateOverview().catch(() => ({ referrals: [], commissions: [], affiliateId: null })),
        ]);

        if (!cancelled) {
          setAcct(a);
          setOverview(o);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load affiliate data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading affiliate…</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Affiliate</h1>
          <p className="text-sm text-slate-400">
            Referral tracking and simulated commissions. (Some affiliate tables currently have type mismatches — UI stays stable.)
          </p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-sm font-semibold">Affiliate ID</div>
            <div className="mt-2 text-2xl font-semibold">
              {overview?.affiliateId ?? acct?.affiliateId ?? "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">Used to link referrals</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-sm font-semibold">Referrals</div>
            <div className="mt-2 text-2xl font-semibold">{overview?.referrals?.length || 0}</div>
            <div className="mt-1 text-xs text-slate-500">Total referred users</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-sm font-semibold">Commissions</div>
            <div className="mt-2 text-2xl font-semibold">{overview?.commissions?.length || 0}</div>
            <div className="mt-1 text-xs text-slate-500">Commission records</div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold">Referral link (demo)</h2>
          <p className="mt-2 text-sm text-slate-400">
            When your affiliate schema is fully normalized, you can generate a stable referral link like:
          </p>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">
            {typeof window !== "undefined"
              ? `${window.location.origin}/signup?ref=${overview?.affiliateId ?? "YOUR_ID"}`
              : `/signup?ref=${overview?.affiliateId ?? "YOUR_ID"}`}
          </div>
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

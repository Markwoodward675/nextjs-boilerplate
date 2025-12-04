"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import {
  getCurrentUser,
  getAffiliateAccount,
  getAffiliateOverview,
} from "../../lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [unverified, setUnverified] = useState(false);
  const [user, setUser] = useState(null);

  const [affiliateAccount, setAffiliateAccount] = useState(null);
  const [overview, setOverview] = useState({ referrals: [], commissions: [] });
  const [error, setError] = useState("");

  const [simReferrals, setSimReferrals] = useState("10");
  const [simAvgDeposit, setSimAvgDeposit] = useState("500");
  const commissionRate = 0.05; // 5% example

  // Email verification gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;

      if (!u) {
        router.replace("/auth/login?next=/affiliate");
        return;
      }

      if (!u.emailVerification) {
        setUser(u);
        setUnverified(true);
        setChecking(false);
        return;
      }

      setUser(u);
      setChecking(false);

      try {
        const acc = await getAffiliateAccount(u.$id);
        const ov = await getAffiliateOverview(u.$id);
        if (!mounted) return;
        setAffiliateAccount(acc);
        setOverview(ov);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const referralCount = overview.referrals?.length || 0;
  const totalCommission = (overview.commissions || []).reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  const referralLink = useMemo(() => {
    if (!user) return "";
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      return `${origin}/auth/register?ref=${user.$id}`;
    }
    return `https://your-daytrader-domain/auth/register?ref=${user.$id}`;
  }, [user]);

  const simRefNum = Number(simReferrals) || 0;
  const simDepositNum = Number(simAvgDeposit) || 0;
  const simulatedEarnings = simRefNum * simDepositNum * commissionRate;

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  if (unverified) {
    return (
      <main className="px-4 pt-6 pb-24">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Verify your email to access affiliate center
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Once your email is verified, you&apos;ll be able to share your
            referral link and track commissions.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section>
        <div className="text-[11px] text-slate-400 mb-1">
          Affiliate center · Turn network into equity
        </div>
        <p className="text-[11px] text-slate-300">
          Share Day Trader with serious traders and investors. As they deposit,
          trade, and allocate capital into plans, you earn a slice of the
          business as recurring affiliate income.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-[3fr,2fr]">
        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Your referral link
          </div>
          {error && (
            <p className="mb-2 text-[10px] text-red-400">
              Unable to load affiliate data: {error}
            </p>
          )}

          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px] text-slate-100 break-all">
            {referralLink || "Loading referral link..."}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Share this link with traders. When they create an account and start
            funding, their activity is tracked to your affiliate account.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-2xl bg-slate-950 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500">Referred traders</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {referralCount}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500">Total commissions</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {totalCommission.toFixed(2)} USD
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-700 px-3 py-2">
              <div className="text-[10px] text-slate-500">Status</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {affiliateAccount?.status || "Active"}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Affiliate earnings simulator
          </div>
          <p className="text-[11px] text-slate-300">
            Use this quick calculator to get a sense of what your network could
            generate each month when traders fund accounts and deploy capital.
          </p>

          <div className="mt-2 space-y-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-0.5">
                Active referred traders
              </label>
              <input
                type="number"
                min="0"
                value={simReferrals}
                onChange={(e) => setSimReferrals(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                Avg. funded capital per trader (USD)
              </label>
              <input
                type="number"
                min="0"
                value={simAvgDeposit}
                onChange={(e) => setSimAvgDeposit(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Estimated monthly affiliate income</span>
                <span>Example rate: 5%</span>
              </div>
              <div className="text-sm font-semibold text-emerald-300">
                {simulatedEarnings.toFixed(2)} USD
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                Real rates and structures can be customized for your program.
                The key is consistent volume from traders who take the craft
                seriously.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

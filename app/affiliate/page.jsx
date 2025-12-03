"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import {
  getCurrentUser,
  COLLECTIONS
} from "../../lib/api";
import {
  databases,
  DB_ID,
  QueryHelper
} from "../../lib/appwrite";

export default function AffiliatePage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    affiliate: null,
    referrals: [],
    commissions: []
  });

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!DB_ID) {
          if (mounted) {
            setState((s) => ({
              ...s,
              loading: false,
              error: "Appwrite database is not configured."
            }));
          }
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setState({
              loading: false,
              error: "You need to be logged in.",
              user: null,
              affiliate: null,
              referrals: [],
              commissions: []
            });
          }
          return;
        }

        const affList = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.affiliateAccounts,
          [QueryHelper.equal("userId", user.$id)]
        );
        const affiliate = affList.total > 0 ? affList.documents[0] : null;

        let referrals = [];
        let commissions = [];

        if (affiliate) {
          const refRes = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.affiliateReferrals,
            [QueryHelper.equal("affiliateUserId", user.$id)]
          );
          referrals = refRes.documents;

          const comRes = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.affiliateCommissions,
            [QueryHelper.equal("affiliateUserId", user.$id)]
          );
          commissions = comRes.documents;
        }

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            affiliate,
            referrals,
            commissions
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState((s) => ({
            ...s,
            loading: false,
            error: "Unable to load affiliate data."
          }));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, affiliate, referrals, commissions } = state;

  const totalReferrals = referrals.length;
  const totalApproved = referrals.filter(
    (r) => r.status === "approved"
  ).length;
  const totalPending = referrals.filter(
    (r) => r.status === "pending"
  ).length;

  const totalCommission = commissions.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Affiliate center
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Track referred traders, funded volume, and commissions generated from
          your Day Trader affiliate links.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading affiliate data…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {user && !affiliate && !loading && (
        <Card>
          <p className="text-xs text-slate-300">
            You don&apos;t have an affiliate account yet. Go to{" "}
            <span className="font-semibold text-blue-300">Settings</span> to
            create your affiliate profile and generate a referral code.
          </p>
        </Card>
      )}

      {user && affiliate && (
        <>
          {/* Metrics row */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {affiliate.status || "pending"}
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                Tier: <span className="font-semibold">{affiliate.tier}</span>
              </p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Referrals
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {totalReferrals}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {totalApproved} approved · {totalPending} pending
              </p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Commission
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-400">
                {totalCommission.toFixed(2)} USD
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Paid out based on funded volume and plan rules.
              </p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Referral code
              </p>
              <p className="mt-1 text-sm font-mono text-blue-200">
                {affiliate.code}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Use links like{" "}
                <span className="font-mono">
                  /auth/register?ref={affiliate.code}
                </span>
              </p>
            </Card>
          </section>

          {/* Pseudo referral chart */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Referral activity
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                A stylized view of signups and commission events across recent
                periods. Wire this to your own analytics as volume grows.
              </p>
              <div className="mt-4 h-40 chart-grid rounded-xl overflow-hidden flex items-end gap-[3px] px-2 pb-3">
                {[6, 14, 10, 22, 18, 30, 24, 28, 20, 26, 34, 18].map(
                  (h, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex items-end justify-center"
                    >
                      <div
                        className="w-[8px] rounded-full bg-gradient-to-t from-slate-800 via-blue-500/80 to-emerald-400/80"
                        style={{ height: `${h + 20}px` }}
                      />
                    </div>
                  )
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Use this area to integrate real signup and funded volume data as
                your affiliate base grows.
              </p>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-100">
                Playbook
              </h2>
              <ul className="mt-2 text-[11px] text-slate-400 space-y-2">
                <li>• Focus on education and process, not hype.</li>
                <li>• Set expectations around risk and drawdowns up front.</li>
                <li>• Encourage small, controlled starting allocations.</li>
                <li>• Treat affiliate revenue as a separate cashflow stream.</li>
              </ul>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

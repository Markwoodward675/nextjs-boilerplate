"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import { getCurrentUser, COLLECTIONS } from "../../lib/api";
import { databases, DB_ID, QueryHelper } from "../../lib/appwrite";

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
      if (!DB_ID) {
        if (mounted) {
          setState({
            loading: false,
            error: "Appwrite database is not configured.",
            user: null,
            affiliate: null,
            referrals: [],
            commissions: []
          });
        }
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setState({
              loading: false,
              error: "You must be logged in to view affiliate data.",
              user: null,
              affiliate: null,
              referrals: [],
              commissions: []
            });
          }
          return;
        }

        const [affList, refs, comms] = await Promise.all([
          databases.listDocuments(
            DB_ID,
            COLLECTIONS.affiliateAccounts,
            [QueryHelper.equal("userId", user.$id)]
          ),
          databases.listDocuments(
            DB_ID,
            COLLECTIONS.affiliateReferrals,
            [QueryHelper.equal("affiliateUserId", user.$id)]
          ),
          databases.listDocuments(
            DB_ID,
            COLLECTIONS.affiliateCommissions,
            [QueryHelper.equal("affiliateUserId", user.$id)]
          )
        ]);

        const affiliate = affList.total > 0 ? affList.documents[0] : null;

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            affiliate,
            referrals: refs.documents,
            commissions: comms.documents
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load affiliate data.",
            user: null,
            affiliate: null,
            referrals: [],
            commissions: []
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, affiliate, referrals, commissions } = state;

  const totalCommission = commissions.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  return (
    <main className="space-y-4 pb-10">
      {loading && (
        <p className="text-xs text-slate-400">Loading affiliate center…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Affiliate center
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage referral codes, track referred traders, and monitor commission
          performance. Payouts are processed through your configured withdrawal
          methods.
        </p>
      </Card>

      {!user && (
        <Card>
          <p className="text-xs text-slate-400">
            Log in to see your affiliate dashboard.
          </p>
        </Card>
      )}

      {user && !affiliate && (
        <Card>
          <p className="text-xs text-slate-400">
            You don&apos;t have an affiliate account yet. Use{" "}
            <span className="underline">Settings &gt; Affiliate center</span> to
            request or create an affiliate account.
          </p>
        </Card>
      )}

      {user && affiliate && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <div className="text-xs text-slate-400">Affiliate code</div>
              <div className="mt-1 text-sm font-mono text-emerald-400">
                {affiliate.code}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Share links like{" "}
                <span className="font-mono">
                  /auth/register?ref={affiliate.code}
                </span>{" "}
                or embed the code in your marketing page URLs.
              </p>
            </Card>
            <Card>
              <div className="text-xs text-slate-400">Status & tier</div>
              <p className="mt-1 text-sm text-slate-100">
                Status:{" "}
                <span className="font-semibold">{affiliate.status}</span>
              </p>
              <p className="text-sm text-slate-100">
                Tier: <span className="font-semibold">{affiliate.tier}</span>
              </p>
            </Card>
            <Card>
              <div className="text-xs text-slate-400">
                Lifetime commission (all currencies)
              </div>
              <div className="mt-1 text-2xl font-bold text-blue-300">
                {totalCommission.toFixed(2)}{" "}
                <span className="text-xs text-slate-500">units</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                For detailed currency breakdowns, aggregate by{" "}
                <span className="font-mono">currency</span> in your analytics
                logic.
              </p>
            </Card>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <h2 className="text-sm font-semibold text-slate-100 mb-2">
                Referred traders
              </h2>
              {referrals.length === 0 && (
                <p className="text-xs text-slate-500">
                  No referrals yet. Start sharing your code to see traders here.
                </p>
              )}
              <div className="space-y-1 text-[11px] text-slate-400">
                {referrals.map((ref) => (
                  <div
                    key={ref.$id}
                    className="flex items-center justify-between border-b border-slate-800/60 last:border-0 py-1"
                  >
                    <div>
                      <div className="font-mono text-slate-300">
                        {ref.referredUserId}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Status: {ref.status}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 text-right">
                      Joined:{" "}
                      {ref.signedUpAt
                        ? new Date(ref.signedUpAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-100 mb-2">
                Commission entries
              </h2>
              {commissions.length === 0 && (
                <p className="text-xs text-slate-500">
                  No commission records yet. Once you start generating
                  commissionable activity, it will appear here.
                </p>
              )}
              <div className="space-y-1 text-[11px] text-slate-400">
                {commissions.map((c) => (
                  <div
                    key={c.$id}
                    className="flex items-center justify-between border-b border-slate-800/60 last:border-0 py-1"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {c.amount?.toFixed(2)} {c.currency}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Type: {c.type} · Status: {c.status}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 text-right">
                      From:{" "}
                      <span className="font-mono">
                        {c.referredUserId || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}

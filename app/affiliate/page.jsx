// app/affiliate/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getAffiliateAccount,
  getAffiliateOverview,
} from "@/lib/api";
import UnverifiedEmailGate from "@/components/UnverifiedEmailGate";

function useProtectedUser() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const u = await getCurrentUser();
        if (!u) {
          router.replace("/signin");
          return;
        }
        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checking };
}

export default function AffiliatePage() {
  const { user, checking } = useProtectedUser();
  const [affiliateAccount, setAffiliateAccount] = useState(null);
  const [overview, setOverview] = useState({ referrals: [], commissions: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [acc, ov] = await Promise.all([
          getAffiliateAccount(user.$id),
          getAffiliateOverview(user.$id),
        ]);
        if (cancelled) return;

        setAffiliateAccount(acc || null);
        setOverview({
          referrals: ov?.referrals || [],
          commissions: ov?.commissions || [],
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load affiliate overview. Please try again shortly."
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (checking || loadingData) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading affiliate panel…</div>
      </main>
    );
  }

  if (!user) return null;

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  const totalCommission = overview.commissions.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Affiliate program
          </h1>
          <p className="text-sm text-slate-400">
            Share Day Trader with friends and track your referrals and simulated
            commissions.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          {affiliateAccount ? (
            <>
              <p className="text-xs uppercase text-slate-400 mb-1">
                Your affiliate link
              </p>
              <p className="text-sm font-mono text-emerald-300 break-all">
                {affiliateAccount.link || affiliateAccount.url || ""}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                When someone signs up through this link and uses the platform,
                their activity can generate simulated commissions for you.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              You haven&apos;t been assigned an affiliate profile yet. Once it&apos;s
              created, your link and stats will appear here.
            </p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-medium text-slate-200 mb-1">
              Referrals
            </h2>
            <p className="text-2xl font-semibold">
              {overview.referrals.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Number of users who joined using your affiliate link.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-medium text-slate-200 mb-1">
              Total simulated commission
            </h2>
            <p className="text-2xl font-semibold text-emerald-300">
              ${totalCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Educational / demo-only commission, not real broker payouts.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

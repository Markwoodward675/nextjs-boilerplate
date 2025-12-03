// app/affiliate/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getAffiliateOverview } from "../../lib/api";

export default function AffiliatePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/affiliate");
        return;
      }
      setUser(u);
      setChecking(false);

      try {
        const o = await getAffiliateOverview(u.$id);
        if (!mounted) return;
        setOverview(o);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  const referrals = overview?.referrals || [];
  const commissions = overview?.commissions || [];
  const totalEarned = commissions.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );

  return (
    <main className="px-4 pt-4 pb-24 space-y-3">
      <Card>
        <h1 className="text-xs font-semibold text-slate-100">
          Affiliate center
        </h1>
        <p className="mt-1 text-[11px] text-slate-400">
          Track referred traders, funded volume, and commissions generated
          from your Day Trader affiliate links.
        </p>
        {error && (
          <p className="mt-2 text-[10px] text-red-400">
            Unable to load affiliate data: {error}
          </p>
        )}
      </Card>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <div className="text-[10px] text-slate-500 uppercase">
            Total referrals
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-50">
            {referrals.length}
          </div>
        </Card>
        <Card>
          <div className="text-[10px] text-slate-500 uppercase">
            Total commissions
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-50">
            {totalEarned.toFixed(2)} USD
          </div>
        </Card>
        <Card>
          <div className="text-[10px] text-slate-500 uppercase">
            Paid payouts
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-50">
            {
              commissions.filter((c) => c.status === "paid").length
            }
          </div>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Referrals
          </h2>
          <div className="mt-2 text-[11px] max-h-52 overflow-auto">
            {referrals.length === 0 && (
              <p className="text-slate-500">
                No referrals recorded yet.
              </p>
            )}
            <ul className="space-y-1.5">
              {referrals.map((r) => (
                <li
                  key={r.$id}
                  className="flex items-center justify-between border-b border-slate-800/80 pb-1 last:border-b-0 last:pb-0"
                >
                  <div className="text-slate-300">
                    {r.referredEmail || "Unknown"}
                    <div className="text-[10px] text-slate-500">
                      {new Date(r.$createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Status:{" "}
                    <span className="capitalize">
                      {r.status || "pending"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Commissions
          </h2>
          <div className="mt-2 text-[11px] max-h-52 overflow-auto">
            {commissions.length === 0 && (
              <p className="text-slate-500">
                No commissions recorded yet.
              </p>
            )}
            <ul className="space-y-1.5">
              {commissions.map((c) => (
                <li
                  key={c.$id}
                  className="flex items-center justify-between border-b border-slate-800/80 pb-1 last:border-b-0 last:pb-0"
                >
                  <div className="text-slate-300">
                    ${c.amount?.toFixed ? c.amount.toFixed(2) : c.amount}{" "}
                    {c.currency || "USD"}
                    <div className="text-[10px] text-slate-500">
                      {new Date(c.$createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] ${
                      c.status === "paid"
                        ? "text-emerald-300"
                        : "text-slate-400"
                    }`}
                  >
                    {c.status || "pending"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>
    </main>
  );
}

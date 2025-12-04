// app/invest/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getUserInvest } from "../../lib/api";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";

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

export default function InvestPage() {
  const { user, checking } = useProtectedUser();
  const [mainWallet, setMainWallet] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const [wallets, txs] = await Promise.all([
          getUserWallets(user.$id),
          getUserTransactions(user.$id, "invest"),
        ]);
        if (cancelled) return;

        setMainWallet((wallets || []).find((w) => w.type === "main") || null);
        setInvestments(txs || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load investment data. Please try again shortly."
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
        <div className="text-sm text-slate-300">Loading investments…</div>
      </main>
    );
  }

  if (!user) return null;

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-5xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Investment plans
          </h1>
          <p className="text-sm text-slate-400">
            Allocate funds from your main wallet into educational investment
            simulations and track returns.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-1">
            Available capital
          </h2>
          {mainWallet ? (
            <>
              <p className="text-2xl font-semibold">
                $
                {Number(mainWallet.balance || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This is your main wallet balance you can allocate into plans.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Main wallet not found yet – it will be created automatically after
              signup.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Investment history
          </h2>
          {investments.length === 0 ? (
            <p className="text-sm text-slate-400">
              You haven&apos;t started any investment simulations yet. Once you
              do, each plan will appear here with its status and returns.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {investments.map((inv) => (
                <div
                  key={inv.$id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-slate-100">
                      {inv.meta || "Investment"} • {inv.status || "active"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {inv.createdAt || inv.$createdAt}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-emerald-300">
                    $
                    {Number(inv.amount || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

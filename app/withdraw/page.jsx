// app/withdraw/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ... } from "../../lib/api";
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

export default function WithdrawPage() {
  const { user, checking } = useProtectedUser();
  const [mainWallet, setMainWallet] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const wallets = await getUserWallets(user.$id);
        if (!cancelled) {
          setMainWallet((wallets || []).find((w) => w.type === "main") || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load wallet balances. Please try again shortly."
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
        <div className="text-sm text-slate-300">Preparing withdrawal…</div>
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
      <div className="mx-auto max-w-3xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Withdraw</h1>
          <p className="text-sm text-slate-400">
            Move funds out of your educational wallet to simulate cashing out.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-1">
            Available balance (main wallet)
          </h2>
          {mainWallet ? (
            <p className="text-2xl font-semibold">
              $
              {Number(mainWallet.balance || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Main wallet not found yet – it will be created automatically after
              signup.
            </p>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            For educational purposes only — these withdrawals do not connect to
            a real bank or broker.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Withdrawal request form
          </h2>
          <p className="text-sm text-slate-400 mb-3">
            Replace this placeholder with your withdrawal logic (manual review,
            NOWPayments, or any simulated payout workflow).
          </p>
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-xs text-slate-500">
            Withdrawal form / workflow goes here.
          </div>
        </section>
      </div>
    </main>
  );
}

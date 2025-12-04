// app/wallet/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getUserWallets } from "../../lib/api";
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

export default function WalletPage() {
  const { user, checking } = useProtectedUser();
  const [wallets, setWallets] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const ws = await getUserWallets(user.$id);
        if (!cancelled) setWallets(ws || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load wallets. Please try again in a moment."
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
        <div className="text-sm text-slate-300">Loading your wallets…</div>
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
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Wallets</h1>
          <p className="text-sm text-slate-400">
            View and manage your main, trading, and affiliate balances.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <section className="space-y-3">
          {wallets.length === 0 ? (
            <p className="text-sm text-slate-400">
              No wallets yet – they&apos;ll be created automatically after
              signup.
            </p>
          ) : (
            wallets.map((wallet) => (
              <div
                key={wallet.$id}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase text-slate-400">
                    {wallet.type} wallet
                  </p>
                  <p className="text-lg font-semibold">
                    $
                    {Number(wallet.balance || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Returns balance: $
                    {Number(
                      wallet.investmentReturnsBalance || 0
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <p>Status: {wallet.status || "active"}</p>
                  <p>Currency: {wallet.currency || "USD"}</p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

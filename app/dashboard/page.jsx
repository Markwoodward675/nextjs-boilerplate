"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import {
  getCurrentUser,
  COLLECTIONS,
  logoutUser
} from "../../lib/api";
import { databases, DB_ID, QueryHelper } from "../../lib/appwrite";

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    wallets: []
  });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!DB_ID) {
          if (mounted) {
            setState({
              loading: false,
              error: "Appwrite database is not configured.",
              user: null,
              wallets: []
            });
          }
          return;
        }

        const user = await getCurrentUser();

        // If there's no current user, send them to login
        if (!user) {
          if (mounted) {
            router.replace("/auth/login?next=/dashboard");
          }
          return;
        }

        const walletsRes = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.wallets,
          [QueryHelper.equal("userId", user.$id)]
        );

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            wallets: walletsRes.documents
          });
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        const code = err?.code || err?.response?.status;

        // If Appwrite says unauthorized, treat as not logged in
        if (code === 401 || code === 403) {
          if (mounted) {
            router.replace("/auth/login?next=/dashboard");
          }
          return;
        }

        if (mounted) {
          setState({
            loading: false,
            error:
              "Unable to load dashboard balances: " +
              (err?.message || ""),
            user: null,
            wallets: []
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const { loading, error, user, wallets } = state;

  const totalBalance = wallets.reduce(
    (sum, w) => sum + (w.balance || 0),
    0
  );
  const mainWallet =
    wallets.find((w) => w.type === "main") || wallets[0] || null;
  const tradingWallet = wallets.find((w) => w.type === "trading") || null;
  const affiliateWallet =
    wallets.find((w) => w.type === "affiliate") || null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    } finally {
      router.replace("/auth/login");
    }
  }

  // While checking auth, just show a small loader (no data for guests)
  if (loading && !user && !error) {
    return (
      <main className="space-y-4 pb-10">
        <Card>
          <p className="text-xs text-slate-400">
            Checking your session…
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4 pb-10">
      {/* Account + Sign out */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Account
            </p>
            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              {user?.name || "Trader"}
            </h1>
            <p className="text-xs text-slate-400">
              {user?.email || "Signed in"} · USER
            </p>
            {user && (
              <p className="mt-1 text-[10px] text-slate-500 font-mono">
                ID: {user.$id}
              </p>
            )}
          </div>

          {user && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="self-start md:self-auto rounded-full border border-slate-700 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-slate-400 hover:text-white disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
        </div>
      </Card>

      {/* Error message if something else failed */}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Total balance */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Total balance
            </p>
            <p className="mt-1 text-xl font-semibold text-blue-200">
              {totalBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}{" "}
              <span className="text-sm text-slate-300">
                {mainWallet?.currency || "USD"}
              </span>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs text-right">
            Sum of main, trading, and affiliate wallets.
          </p>
        </div>
      </Card>

      {/* Wallet breakdown */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Main wallet
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {mainWallet
              ? mainWallet.balance.toFixed(2)
              : "0.00"}{" "}
            {mainWallet?.currency || "USD"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Funding and capital allocation.
          </p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Trading wallet
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {tradingWallet
              ? tradingWallet.balance.toFixed(2)
              : "0.00"}{" "}
            {tradingWallet?.currency || mainWallet?.currency || "USD"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Active risk capital for live strategies.
          </p>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Affiliate wallet
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {affiliateWallet
              ? affiliateWallet.balance.toFixed(2)
              : "0.00"}{" "}
            {affiliateWallet?.currency ||
              tradingWallet?.currency ||
              mainWallet?.currency ||
              "USD"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Earnings from referred traders and funded volume.
          </p>
        </Card>
      </section>
    </main>
  );
}

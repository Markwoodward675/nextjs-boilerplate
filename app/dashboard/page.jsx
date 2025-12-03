"use client";

import Card from "../../components/Card";
import { useEffect, useState } from "react";
import { getCurrentUser, COLLECTIONS } from "../../lib/api";
import { databases, DB_ID, QueryHelper } from "../../lib/appwrite";

export default function DashboardPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    wallets: []
  });

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
        if (!user) {
          if (mounted) {
            setState({
              loading: false,
              error: "You need to be logged in.",
              user: null,
              wallets: []
            });
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
        console.error(err);
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
  }, []);

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

  return (
    <main className="space-y-4 pb-10">
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
          <div className="text-right text-xs text-slate-400">
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
            <p className="mt-1 text-[11px] text-slate-500">
              Sum of main, trading, and affiliate wallets.
            </p>
          </div>
        </div>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading balances…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Wallet quick view */}
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

      {/* Portfolio / risk / execution like before (you can keep or tweak) */}
      {/* ... keep previous blocks here if you like them ... */}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import WalletCard from "../../components/WalletCard";
import {
  getCurrentUser,
  COLLECTIONS
} from "../../lib/api";
import {
  databases,
  DB_ID,
  QueryHelper
} from "../../lib/appwrite";

export default function WalletPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    wallets: []
  });
  const [avatarUrl, setAvatarUrl] = useState(null);

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

        const res = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.wallets,
          [QueryHelper.equal("userId", user.$id)]
        );

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            wallets: res.documents
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load wallets.",
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("daytrader_avatar");
      if (stored) setAvatarUrl(stored);
    } catch {
      // ignore
    }
  }, []);

  const { loading, error, wallets } = state;

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Wallets & balances
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Maintain separate main, trading, and affiliate wallets. Use card-style
          balances to keep risk compartments clear.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading wallets…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {wallets.length === 0 ? (
          <Card>
            <p className="text-xs text-slate-400">
              No wallets found yet. Once your first wallet is created and
              funded, it will appear here.
            </p>
          </Card>
        ) : (
          wallets.map((w) => (
            <WalletCard key={w.$id} wallet={w} avatarUrl={avatarUrl} />
          ))
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Funding & flows
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Use Deposits to add capital, then move funds between wallets to
            reflect how much risk you want active. Withdraw to external
            accounts when you lock in results.
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Allocation discipline
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Keeping trading and affiliate balances separated prevents blurred
            decisions. Capital for trades, capital for expenses, and capital for
            compounding can be tracked independently.
          </p>
        </Card>
      </section>
    </main>
  );
}

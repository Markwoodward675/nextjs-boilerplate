"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import { getCurrentUser, COLLECTIONS } from "../../lib/api";
import {
  databases,
  DB_ID,
  QueryHelper,
  IDHelper
} from "../../lib/appwrite";

export default function SettingsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    affiliate: null
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
              affiliate: null
            });
          }
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setState({
              loading: false,
              error: "You need to be logged in to manage settings.",
              user: null,
              affiliate: null
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

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            affiliate
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load settings.",
            user: null,
            affiliate: null
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, affiliate } = state;

  async function handleCreateAffiliate() {
    if (!user || !DB_ID) return;
    try {
      const code =
        "DAY" +
        user.$id
          .slice(0, 6)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

      const doc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.affiliateAccounts,
        IDHelper.unique(),
        {
          userId: user.$id,
          code,
          status: "pending",
          tier: "standard",
          lifetimeCommission: 0,
          totalDeposits: 0,
          totalSignups: 0
        }
      );

      setState((prev) => ({ ...prev, affiliate: doc, error: "" }));
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        error: err?.message || "Could not create affiliate account."
      }));
    }
  }

  return (
    <main className="space-y-4 pb-10">
      {loading && (
        <p className="text-xs text-slate-400">Loading settings…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Account settings
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your Day Trader profile, preferences, and affiliate program
          access.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Affiliate center
        </h2>
        {!user && (
          <p className="mt-1 text-xs text-slate-400">
            Log in to manage affiliate settings.
          </p>
        )}
        {user && !affiliate && (
          <div className="mt-2 space-y-2 text-xs text-slate-400">
            <p>
              You don&apos;t have an affiliate account yet. Create one to
              generate a referral code and earn commissions when traders sign up
              via your links.
            </p>
            <button
              onClick={handleCreateAffiliate}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Create affiliate account
            </button>
          </div>
        )}
        {user && affiliate && (
          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <p>
              Status:{" "}
              <span className="font-semibold">{affiliate.status}</span>
            </p>
            <p>
              Code:{" "}
              <span className="font-mono text-emerald-400">
                {affiliate.code}
              </span>
            </p>
            <p>
              Tier: <span className="font-semibold">{affiliate.tier}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Share links like{" "}
              <span className="font-mono">
                /auth/register?ref={affiliate.code}
              </span>{" "}
              or store the code in your marketing pages. Deposits and
              transactions from referred users can generate commission entries
              in your Appwrite collections.
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}

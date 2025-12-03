"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import {
  getCurrentUser,
  COLLECTIONS
} from "../../lib/api";
import {
  databases,
  DB_ID,
  QueryHelper,
  IDHelper
} from "../../lib/appwrite";

const PLANS = [
  {
    id: "novice",
    name: "Novice / Starter",
    range: "$200 – $999",
    min: 200,
    max: 999,
    roi: "3%",
    description:
      "Designed for traders starting with controlled risk and small allocations."
  },
  {
    id: "standard",
    name: "Standard",
    range: "$1,000 – $4,999",
    min: 1000,
    max: 4999,
    roi: "5%",
    description:
      "For traders building consistency and scaling size in a structured way."
  },
  {
    id: "elite",
    name: "Elite",
    range: "$5,000 – $9,999",
    min: 5000,
    max: 9999,
    roi: "7%",
    description:
      "For advanced traders treating the account as a serious capital base."
  }
];

export default function InvestPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    mainWallet: null
  });
  const [actionMessage, setActionMessage] = useState("");

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
              mainWallet: null
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
              mainWallet: null
            });
          }
          return;
        }

        const walletRes = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.wallets,
          [QueryHelper.equal("userId", user.$id)]
        );
        let mainWallet = null;
        if (walletRes.total > 0) {
          mainWallet =
            walletRes.documents.find((w) => w.type === "main") ||
            walletRes.documents[0];
        }

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            mainWallet
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load wallets.",
            user: null,
            mainWallet: null
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, mainWallet } = state;

  async function handleInvest(plan) {
    setActionMessage("");
    if (!user || !mainWallet) {
      setActionMessage("No wallet found. Please create or fund a wallet first.");
      return;
    }

    let amount = plan.min;

    try {
      if (typeof window !== "undefined") {
        const raw = window.prompt(
          `Enter amount for ${plan.name} (${plan.range}). Minimum ${plan.min}, maximum ${plan.max}.`,
          String(plan.min)
        );
        if (!raw) return;
        const parsed = parseFloat(raw);
        if (Number.isNaN(parsed)) {
          setActionMessage("Invalid amount.");
          return;
        }
        if (parsed < plan.min || parsed > plan.max) {
          setActionMessage(
            `Amount must be between ${plan.min} and ${plan.max}.`
          );
          return;
        }
        amount = parsed;
      }
    } catch {
      // fallback: use min
    }

    const currentBalance = mainWallet.balance || 0;
    if (currentBalance < amount) {
      setActionMessage("Insufficient wallet balance for this plan.");
      return;
    }

    try {
      // Deduct from wallet
      const newBalance = currentBalance - amount;

      const updatedWallet = await databases.updateDocument(
        DB_ID,
        COLLECTIONS.wallets,
        mainWallet.$id,
        {
          balance: newBalance
        }
      );

      // Record transaction (make sure your transactions collection has these attributes)
      try {
        await databases.createDocument(
          DB_ID,
          COLLECTIONS.transactions,
          IDHelper.unique(),
          {
            userId: user.$id,
            type: "investment",
            direction: "out",
            amount,
            currency: mainWallet.currency || "USD",
            status: "pending",
            planId: plan.id,
            planName: plan.name,
            roi: plan.roi
          }
        );
      } catch (errTx) {
        console.error("Transaction creation failed:", errTx);
        // Non-fatal for UI
      }

      setState((prev) => ({
        ...prev,
        mainWallet: updatedWallet
      }));
      setActionMessage(
        `Investment created in ${plan.name} plan for ${amount.toFixed(
          2
        )} ${mainWallet.currency || "USD"}.`
      );
    } catch (err) {
      console.error(err);
      setActionMessage(
        "Could not create investment. Please try again later."
      );
    }
  }

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Investment plans
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Allocate a portion of your wallet into structured plans with defined
          ranges and target returns. Treat these as deliberate, sized
          allocations, not random gambles.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading wallet data…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {mainWallet && (
        <Card>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Main wallet
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {mainWallet.balance?.toFixed(2)}{" "}
            {mainWallet.currency || "USD"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Funds for investment allocations and strategies are deducted from
            this wallet.
          </p>
        </Card>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLANS.map((plan) => (
          <Card key={plan.id}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {plan.range}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">
              {plan.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Target ROI:{" "}
              <span className="font-semibold text-emerald-400">
                {plan.roi}
              </span>
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {plan.description}
            </p>
            <button
              onClick={() => handleInvest(plan)}
              className="mt-3 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Allocate into plan
            </button>
          </Card>
        ))}
      </section>

      {actionMessage && (
        <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
          {actionMessage}
        </p>
      )}
    </main>
  );
}

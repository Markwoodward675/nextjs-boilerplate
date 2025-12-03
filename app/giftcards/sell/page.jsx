"use client";

import { useEffect, useState } from "react";
import Card from "../../../components/Card";
import {
  getCurrentUser,
  COLLECTIONS
} from "../../../lib/api";
import {
  databases,
  DB_ID,
  QueryHelper,
  IDHelper
} from "../../../lib/appwrite";

const BRANDS = [
  { id: "amazon", name: "Amazon" },
  { id: "playstation", name: "PlayStation" },
  { id: "steam", name: "Steam" }
];

// Example payout rate – adjust as you like
const PAYOUT_RATE = 0.98; // 98% of face value

export default function SellGiftCardsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    mainWallet: null,
    giftTransactions: []
  });

  const [brand, setBrand] = useState(BRANDS[0].id);
  const [amount, setAmount] = useState("50");
  const [message, setMessage] = useState("");

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
              mainWallet: null,
              giftTransactions: []
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
              mainWallet: null,
              giftTransactions: []
            });
          }
          return;
        }

        // Wallet
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

        // Transactions (preview only)
        const txRes = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.transactions,
          [QueryHelper.equal("userId", user.$id)]
        );
        const giftTransactions = txRes.documents.filter((tx) =>
          ["giftcard_buy", "giftcard_sell"].includes(tx.type || "")
        );

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            mainWallet,
            giftTransactions
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error:
              "Unable to load gift card data: " + (err?.message || ""),
            user: null,
            mainWallet: null,
            giftTransactions: []
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, mainWallet, giftTransactions } = state;

  async function handleSell(e) {
    e.preventDefault();
    setMessage("");

    if (!user || !mainWallet) {
      setMessage("No wallet available for payout.");
      return;
    }

    const brandInfo = BRANDS.find((b) => b.id === brand);
    if (!brandInfo) {
      setMessage("Invalid brand.");
      return;
    }

    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      setMessage("Invalid amount.");
      return;
    }

    const payoutAmount = value * PAYOUT_RATE;
    const currentBalance = Number(mainWallet.balance || 0);
    const newBalance = currentBalance + payoutAmount;

    try {
      const updatedWallet = await databases.updateDocument(
        DB_ID,
        COLLECTIONS.wallets,
        mainWallet.$id,
        {
          balance: newBalance
        }
      );

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.transactions,
        IDHelper.unique(),
        {
          userId: user.$id,
          type: "giftcard_sell",
          direction: "in",
          amount: payoutAmount,
          currency: mainWallet.currency || "USD",
          status: "pending",
          note: `Gift card sell: ${brandInfo.name} (${value.toFixed(
            2
          )} face, ${PAYOUT_RATE * 100}% payout)`
        }
      );

      setState((prev) => ({
        ...prev,
        mainWallet: updatedWallet,
        giftTransactions: [
          {
            // quick local preview, real one is in DB too
            $id: "local-" + Date.now(),
            $createdAt: new Date().toISOString(),
            type: "giftcard_sell",
            direction: "in",
            amount: payoutAmount,
            currency: mainWallet.currency || "USD",
            status: "pending",
            note: `Gift card sell: ${brandInfo.name} (${value.toFixed(
              2
            )} face)`
          },
          ...prev.giftTransactions
        ]
      }));

      setMessage(
        `Gift card sell recorded: ${brandInfo.name} ${value.toFixed(
          2
        )} face value, payout ${payoutAmount.toFixed(
          2
        )} ${mainWallet.currency || "USD"}.`
      );
    } catch (err) {
      console.error(err);
      setMessage("Unable to process gift card sell right now.");
    }
  }

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Sell gift cards
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Convert supported gift cards into wallet balance. Payouts are
          recorded as incoming transactions and are subject to admin review.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading data…</p>
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
            {Number(mainWallet.balance || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}{" "}
            {mainWallet.currency || "USD"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Gift card sells credit this balance after admin verification.
          </p>
        </Card>
      )}

      {/* Sell form */}
      <Card>
        <form
          onSubmit={handleSell}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
        >
          <div>
            <p className="text-[11px] text-slate-500 mb-1">
              Gift card brand
            </p>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">
              Face value (USD)
            </p>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Payout at {PAYOUT_RATE * 100}% of face value.
            </p>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-emerald-500"
            >
              Sell gift card
            </button>
          </div>
        </form>

        {message && (
          <p className="mt-3 text-xs text-emerald-400">{message}</p>
        )}
      </Card>

      {/* Transactions preview */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Gift card transaction preview
        </h2>
        {giftTransactions.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            No gift card transactions yet. Your buy and sell activity will
            appear here.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Direction</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {giftTransactions.map((tx) => (
                  <tr
                    key={tx.$id}
                    className="border-b border-slate-900 last:border-0"
                  >
                    <td className="py-2 pr-3 text-slate-400">
                      {new Date(tx.$createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-slate-200">
                      {tx.type}
                    </td>
                    <td className="py-2 pr-3 text-slate-200">
                      {tx.direction}
                    </td>
                    <td className="py-2 pr-3 text-emerald-300">
                      {typeof tx.amount === "number"
                        ? tx.amount.toFixed(2)
                        : tx.amount}{" "}
                      {tx.currency || "USD"}
                    </td>
                    <td className="py-2 pr-3 text-slate-200">
                      {tx.status || "-"}
                    </td>
                    <td className="py-2 pr-3 text-slate-400">
                      {tx.note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}

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
  { id: "amazon", name: "Amazon", min: 25, max: 500 },
  { id: "playstation", name: "PlayStation", min: 20, max: 200 },
  { id: "steam", name: "Steam", min: 10, max: 250 }
];

export default function BuyGiftCardsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    mainWallet: null
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
            error:
              "Unable to load wallet: " + (err?.message || ""),
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

  async function handleBuy(e) {
    e.preventDefault();
    setMessage("");

    if (!user || !mainWallet) {
      setMessage("No wallet available for purchase.");
      return;
    }

    const brandInfo = BRANDS.find((b) => b.id === brand);
    if (!brandInfo) {
      setMessage("Invalid brand.");
      return;
    }

    const value = parseFloat(amount);
    if (Number.isNaN(value)) {
      setMessage("Invalid amount.");
      return;
    }
    if (value < brandInfo.min || value > brandInfo.max) {
      setMessage(
        `Amount must be between ${brandInfo.min} and ${brandInfo.max}.`
      );
      return;
    }

    const balance = mainWallet.balance || 0;
    if (balance < value) {
      setMessage("Insufficient wallet balance for this gift card.");
      return;
    }

    try {
      const newBalance = balance - value;

      const updatedWallet = await databases.updateDocument(
        DB_ID,
        COLLECTIONS.wallets,
        mainWallet.$id,
        { balance: newBalance }
      );

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.transactions,
        IDHelper.unique(),
        {
          userId: user.$id,
          type: "giftcard_buy",
          direction: "out",
          amount: value,
          currency: mainWallet.currency || "USD",
          status: "pending",
          note: `Gift card purchase: ${brandInfo.name}`
        }
      );

      setState((prev) => ({ ...prev, mainWallet: updatedWallet }));
      setMessage(
        `Gift card purchase recorded for ${brandInfo.name} – ${value.toFixed(
          2
        )} ${mainWallet.currency || "USD"}.`
      );
    } catch (err) {
      console.error(err);
      setMessage("Unable to process gift card purchase right now.");
    }
  }

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Buy gift cards
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Convert a portion of your wallet into digital gift cards for spending,
          rewards, or controlled payouts.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading wallet…</p>
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
            {mainWallet.balance.toFixed(2)}{" "}
            {mainWallet.currency || "USD"}
          </p>
        </Card>
      )}

      <Card>
        <form
          onSubmit={handleBuy}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
        >
          <div>
            <p className="text-[11px] text-slate-500 mb-1">Brand</p>
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
            <p className="text-[11px] text-slate-500 mb-1">Amount</p>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500"
            >
              Buy gift card
            </button>
          </div>
        </form>

        {message && (
          <p className="mt-3 text-xs text-emerald-400">{message}</p>
        )}
      </Card>
    </main>
  );
}

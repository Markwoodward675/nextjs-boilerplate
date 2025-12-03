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
  QueryHelper
} from "../../lib/appwrite";

export default function TransactionsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    transactions: []
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
              transactions: []
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
              transactions: []
            });
          }
          return;
        }

        const txRes = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.transactions,
          [QueryHelper.equal("userId", user.$id)]
        );

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            transactions: txRes.documents
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load transactions.",
            user: null,
            transactions: []
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, transactions } = state;

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Transactions
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Ledger of deposits, withdrawals, investments, and affiliate
          commissions tied to your account.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading transactions…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Card>
        {transactions.length === 0 ? (
          <p className="text-xs text-slate-400">
            No transactions recorded yet. As you fund, withdraw, and invest,
            they will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Direction</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.$id}
                    className="border-b border-slate-900 last:border-0"
                  >
                    <td className="py-2 pr-3 text-slate-400">
                      {new Date(tx.$createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-slate-200">
                      {tx.type || "-"}
                    </td>
                    <td className="py-2 pr-3 text-slate-200">
                      {tx.direction || "-"}
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
                      {tx.planName
                        ? `Plan: ${tx.planName} (${tx.roi || ""})`
                        : tx.note || "-"}
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

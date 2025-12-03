"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import { getCurrentUser, COLLECTIONS } from "../../lib/api";
import { databases, DB_ID, QueryHelper } from "../../lib/appwrite";

export default function AlertsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    alerts: []
  });

  const [selected, setSelected] = useState(null);

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
              alerts: []
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
              alerts: []
            });
          }
          return;
        }

        const res = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.alerts,
          [QueryHelper.equal("userId", user.$id)]
        );

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            alerts: res.documents
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error:
              "Unable to load alerts: " + (err?.message || ""),
            user: null,
            alerts: []
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, alerts } = state;

  return (
    <main className="space-y-4 pb-10">
      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Notifications & alerts
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Incoming messages from admin and transaction-related notifications are
          listed here. Tap any item to preview its details.
        </p>
      </Card>

      {loading && (
        <p className="text-xs text-slate-400">Loading alerts…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Card>
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-400">
            You don&apos;t have any alerts yet. Admin announcements and
            transaction updates will appear here.
          </p>
        ) : (
          <div className="divide-y divide-slate-900">
            {alerts.map((alert) => (
              <button
                key={alert.$id}
                onClick={() => setSelected(alert)}
                className="w-full text-left py-3 flex items-start gap-3 text-xs hover:bg-slate-900/60"
              >
                <div className="mt-[2px] h-2 w-2 rounded-full bg-emerald-400/80" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-100 font-medium">
                      {alert.title}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(alert.$createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                    {alert.body}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Type: {alert.type || "general"} ·{" "}
                    {alert.status || "unread"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Modal preview */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 max-w-md w-full">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-100">
                {selected.title}
              </p>
              <button
                onClick={() => setSelected(null)}
                className="h-7 w-7 rounded-full border border-slate-700 flex items-center justify-center text-xs text-slate-200"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">
              {new Date(selected.$createdAt).toLocaleString()} ·{" "}
              {selected.type || "general"}
            </p>
            <p className="text-xs text-slate-200 whitespace-pre-line">
              {selected.body}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

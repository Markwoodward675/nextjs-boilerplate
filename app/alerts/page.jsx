// app/alerts/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserAlerts } from "../../lib/api";

export default function AlertsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/alerts");
        return;
      }
      setUser(u);
      setChecking(false);

      try {
        const list = await getUserAlerts(u.$id);
        if (!mounted) return;
        setAlerts(list);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-3">
      <Card>
        <h1 className="text-xs font-semibold text-slate-100">
          Alerts & notifications
        </h1>
        <p className="mt-1 text-[11px] text-slate-400">
          Incoming messages from admin and transaction-related notifications
          are listed here. Tap any item to preview details.
        </p>
        {error && (
          <p className="mt-2 text-[10px] text-red-400">
            Unable to load alerts: {error}
          </p>
        )}
      </Card>

      <Card>
        <ul className="divide-y divide-slate-800 text-[11px]">
          {alerts.length === 0 && !error && (
            <li className="py-3 text-slate-500">
              You don&apos;t have any alerts yet. Admin announcements and
              transaction updates will appear here.
            </li>
          )}
          {alerts.map((a) => (
            <li
              key={a.$id}
              className="py-2 flex items-center justify-between cursor-pointer hover:bg-slate-900/70 rounded-lg px-2 -mx-2"
              onClick={() => setActive(a)}
            >
              <div>
                <div className="font-medium text-slate-100">
                  {a.title || "Notification"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {new Date(a.$createdAt).toLocaleString()}
                </div>
              </div>
              <span className="text-[10px] text-slate-400">
                {a.category || "general"}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {active && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
          onClick={() => setActive(null)}
        >
          <div
            className="max-w-sm w-full rounded-3xl bg-slate-950 border border-slate-700/80 px-4 py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-semibold text-slate-100">
              {active.title || "Notification"}
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">
              {new Date(active.$createdAt).toLocaleString()} ·{" "}
              {active.category || "general"}
            </p>
            <p className="mt-3 text-[11px] text-slate-300 whitespace-pre-wrap">
              {active.body || active.message || "No content."}
            </p>
            <button
              onClick={() => setActive(null)}
              className="mt-4 w-full rounded-full bg-slate-800 px-4 py-2 text-[11px] text-slate-100 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

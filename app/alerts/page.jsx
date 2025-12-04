// app/alerts/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getUserAlerts,
  claimSignupBonus,
} from "../../lib/api";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";

function useProtectedUser() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const u = await getCurrentUser();
        if (!u) {
          router.replace("/signin");
          return;
        }
        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checking };
}

export default function AlertsPage() {
  const { user, checking } = useProtectedUser();
  const [alerts, setAlerts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [claimMessage, setClaimMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const als = await getUserAlerts(user.$id);
        if (!cancelled) setAlerts(als || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to load alerts. Please try again shortly."
          );
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleClaimBonus = async (alert) => {
    if (!user) return;
    setClaimMessage("");
    setError("");
    setClaimingId(alert.$id);

    try {
      const res = await claimSignupBonus(user.$id, alert.$id);

      // Update alerts state locally to reflect claimed status
      setAlerts((prev) =>
        prev.map((a) =>
          a.$id === alert.$id
            ? {
                ...a,
                claimed: true,
                status: "claimed",
              }
            : a
        )
      );

      setClaimMessage(
        `Signup bonus claimed successfully. New balance: $${Number(
          res?.newBalance || 0
        ).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to claim signup bonus. Please ensure you have a completed deposit and a completed investment or trade."
      );
    } finally {
      setClaimingId(null);
    }
  };

  if (checking || loadingData) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading alerts…</div>
      </main>
    );
  }

  if (!user) return null;

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  const sorted = [...alerts].sort(
    (a, b) =>
      new Date(b.createdAt || b.$createdAt) -
      new Date(a.createdAt || a.$createdAt)
  );

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-slate-400">
            Platform notifications, educational tips, and your $100 signup bonus
            all live here.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}
        {claimMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
            {claimMessage}
          </div>
        )}

        <section className="space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">
              You have no alerts yet. Once you start using the platform, updates
              will appear here.
            </p>
          ) : (
            sorted.map((alert) => {
              const isSignupBonus = alert.category === "signup_bonus";
              const isClaimed =
                alert.claimed || alert.status === "claimed";

              return (
                <div
                  key={alert.$id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-slate-400 mb-1">
                        {alert.category || "general"}
                      </p>
                      <p className="font-medium text-slate-50">
                        {alert.title}
                      </p>
                      {alert.body && (
                        <p className="mt-1 text-xs text-slate-400">
                          {alert.body}
                        </p>
                      )}
                    </div>

                    {isSignupBonus && !isClaimed && (
                      <button
                        type="button"
                        onClick={() => handleClaimBonus(alert)}
                        disabled={claimingId === alert.$id}
                        className="rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-50 hover:bg-emerald-500/20 transition disabled:opacity-60"
                      >
                        {claimingId === alert.$id
                          ? "Claiming…"
                          : `Claim $${alert.bonusAmount || 100} bonus`}
                      </button>
                    )}

                    {isSignupBonus && isClaimed && (
                      <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                        Bonus claimed
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Status:{" "}
                      {alert.status ||
                        (alert.claimed ? "claimed" : "active")}
                    </span>
                    <span>{alert.createdAt || alert.$createdAt}</span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

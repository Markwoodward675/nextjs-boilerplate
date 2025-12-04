"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserAlerts, claimSignupBonus } from "../../lib/api";

export default function AlertsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [unverified, setUnverified] = useState(false);
  const [user, setUser] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  // Email verification gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;

      if (!u) {
        router.replace("/auth/login?next=/alerts");
        return;
      }

      if (!u.emailVerification) {
        setUser(u);
        setUnverified(true);
        setChecking(false);
        return;
      }

      setUser(u);
      setChecking(false);

      try {
        const al = await getUserAlerts(u.$id);
        if (!mounted) return;
        setAlerts(al);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const refreshAlerts = async () => {
    if (!user) return;
    try {
      const al = await getUserAlerts(user.$id);
      setAlerts(al);
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    }
  };

  const handleClaimBonus = async (alertId) => {
    if (!user) return;
    setClaimError("");
    setClaimSuccess("");
    setClaimingId(alertId);
    try {
      await claimSignupBonus(user.$id, alertId);
      setClaimSuccess("Signup bonus claimed successfully.");
      await refreshAlerts();
    } catch (err) {
      console.error(err);
      setClaimError(
        err?.message ||
          "Unable to claim bonus. Please ensure you have a completed deposit and invest/trade."
      );
    } finally {
      setClaimingId(null);
    }
  };

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  if (unverified) {
    return (
      <main className="px-4 pt-6 pb-24">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Verify your email to receive alerts
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Once your email is verified, you&apos;ll see admin announcements and
            transaction notices here.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section>
        <div className="text-[11px] text-slate-400 mb-1">
          Alerts & notifications
        </div>
        <p className="text-[11px] text-slate-300">
          Incoming messages from admin and system events like deposits,
          withdrawals, and investment updates are listed here. Tap any alert to
          see more detail.
        </p>
      </section>

      <section>
        <Card>
          {error && (
            <p className="mb-2 text-[10px] text-red-400">
              Unable to load alerts: {error}
            </p>
          )}
          {claimError && (
            <p className="mb-2 text-[10px] text-red-400">{claimError}</p>
          )}
          {claimSuccess && (
            <p className="mb-2 text-[10px] text-emerald-400">{claimSuccess}</p>
          )}

          {alerts.length === 0 && !error && (
            <p className="text-[11px] text-slate-500">
              You don&apos;t have any alerts yet. Admin announcements and
              transaction updates will appear here.
            </p>
          )}

          <ul className="space-y-2">
            {alerts.map((alert) => {
              const isSignupBonus = alert.category === "signup_bonus";
              const claimed = alert.claimed || alert.status === "claimed";
              return (
                <li
                  key={alert.$id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100">
                      {alert.title || "Alert"}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(alert.$createdAt).toLocaleString()}
                    </div>
                  </div>
                  <p className="mt-1 text-slate-300">{alert.body}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 capitalize">
                      {alert.category || "general"}
                    </span>
                    {isSignupBonus && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            claimed
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {claimed ? "Claimed" : "Claimable"}
                        </span>
                        {!claimed && (
                          <button
                            type="button"
                            onClick={() => handleClaimBonus(alert.$id)}
                            disabled={claimingId === alert.$id}
                            className="rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-[10px] text-slate-950 font-semibold px-3 py-1 disabled:opacity-60"
                          >
                            {claimingId === alert.$id
                              ? "Claiming…"
                              : "Claim $100 bonus"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>
    </main>
  );
}

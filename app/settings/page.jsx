"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserProfile } from "../../lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancelled) return;

        setUser(u);

        const p = await getUserProfile(u.$id);
        if (!cancelled) setProfile(p);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading settings…</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-slate-400">Manage your profile info (read-only for now).</p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500">Full name</div>
              <div className="text-sm text-slate-100">{profile?.fullName || user?.name || "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500">Email</div>
              <div className="text-sm text-slate-100">{profile?.email || user?.email || "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500">Username</div>
              <div className="text-sm text-slate-100">{profile?.username || "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="text-xs text-slate-500">KYC status</div>
              <div className="text-sm text-slate-100">{profile?.kycStatus || "not_submitted"}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold">Next step</h2>
          <p className="mt-2 text-sm text-slate-400">
            If you want, I’ll add an “Edit profile” form that updates your <code className="text-slate-200">user_profile</code>
            document (docId = user.$id) safely.
          </p>
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

// app/settings/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser } from "@/lib/api";
import UnverifiedEmailGate from "@/components/UnverifiedEmailGate";

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

export default function SettingsPage() {
  const router = useRouter();
  const { user, checking } = useProtectedUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      router.replace("/signin");
    } finally {
      setLoggingOut(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading settings…</div>
      </main>
    );
  }

  if (!user) return null;

  const emailVerified =
    user.emailVerification || user?.prefs?.emailVerification;
  if (!emailVerified) {
    return <UnverifiedEmailGate email={user.email} />;
  }

  return (
    <main className="min-h-[80vh] bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-3xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-slate-400">
            Manage your account details for your Day Trader profile.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400 mb-1">Full name</p>
            <p className="text-slate-100">{user.name || "Not set"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 mb-1">Email</p>
            <p className="text-slate-100 break-all">{user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400 mb-1">
              Email status
            </p>
            <p className="text-emerald-300 text-sm">Verified</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="text-sm font-medium text-slate-200 mb-2">
            Security & sign-out
          </h2>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/20 transition disabled:opacity-60"
          >
            {loggingOut ? "Signing out…" : "Sign out of this device"}
          </button>
        </section>
      </div>
    </main>
  );
}

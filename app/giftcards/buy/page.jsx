// app/giftcards/buy/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/api";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";

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

export default function BuyGiftcardsPage() {
  const { user, checking } = useProtectedUser();

  if (checking) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading gift cards…</div>
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
      <div className="mx-auto max-w-4xl space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Buy gift cards
          </h1>
          <p className="text-sm text-slate-400">
            Simulate buying digital gift cards as an alternative deposit method
            in your educational trading setup.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-sm text-slate-400 mb-3">
            This is a placeholder section. Plug in your real or demo gift card
            provider UI here (brands, amounts, and purchase flow).
          </p>
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-xs text-slate-500">
            Gift card catalog / purchase form goes here.
          </div>
        </section>
      </div>
    </main>
  );
}

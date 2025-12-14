"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import { getCurrentUser } from "../../../lib/api";

export default function GiftcardsSellPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    })();

    return () => (cancelled = true);
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading giftcards…</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Giftcards • Sell</h1>
          <p className="text-sm text-slate-400">
            Submit a demo sell request (upload & pricing logic can be added next).
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold">Sell request (demo)</div>
          <p className="mt-2 text-sm text-slate-400">
            Next step: add upload, validation, and create a transaction record.
          </p>
          <button
            className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
            onClick={() => alert("Next step: implement giftcard sell request → transactions + admin review queue.")}
          >
            Create sell request (coming next)
          </button>
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

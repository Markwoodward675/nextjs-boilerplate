"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserWallets } from "../../../lib/api";

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function GiftcardsBuyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mainBalance, setMainBalance] = useState(0);
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

        const ws = await getUserWallets(u.$id);
        const main = (ws || []).find((w) => w.currencyType === "main");
        if (!cancelled) setMainBalance(main?.balance || 0);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load giftcard buy page.");
      } finally {
        if (!cancelled) setLoading(false);
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
          <h1 className="text-2xl font-semibold">Giftcards • Buy</h1>
          <p className="text-sm text-slate-400">
            Educational demo marketplace UI (no real fulfillment yet).
          </p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-sm font-semibold">Main wallet</div>
          <div className="mt-2 text-3xl font-semibold">{money(mainBalance)}</div>
          <div className="mt-1 text-xs text-slate-500">Use this for demo purchases</div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold mb-2">Popular cards</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {["Amazon", "iTunes", "Steam"].map((name) => (
              <div key={name} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-sm font-semibold">{name}</div>
                <div className="mt-1 text-xs text-slate-500">Demo listing</div>
                <button
                  className="mt-3 w-full rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition"
                  onClick={() => alert("Next step: create giftcard order + transaction write.")}
                >
                  Buy (coming next)
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

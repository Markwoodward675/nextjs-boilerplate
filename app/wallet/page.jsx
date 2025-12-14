"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { getCurrentUser, getUserWallets } from "../../lib/api";

function money(n) {
  return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
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
        if (!cancelled) setWallets(ws || []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load wallets.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const byType = useMemo(() => {
    const map = { main: null, trading: null, affiliate: null };
    (wallets || []).forEach((w) => {
      const k = w.currencyType;
      if (k && map[k] === null) map[k] = w;
    });
    return map;
  }, [wallets]);

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-300">Loading wallets…</div>
      </main>
    );
  }
  if (!user) return null;

  const card = (title, subtitle, w) => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-slate-400">{subtitle}</div>
      <div className="mt-3 text-3xl font-semibold">{money(w?.balance)}</div>
      <div className="mt-1 text-xs text-slate-500">
        Status: {w ? (w.isActive ? "active" : "inactive") : "not created"}
      </div>
    </div>
  );

  return (
    <UnverifiedEmailGate>
      <main className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Wallets</h1>
          <p className="text-sm text-slate-400">
            Your educational balances for simulations. Deposits and withdrawals are simulated.
          </p>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {err}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          {card("Main wallet", "Overall portfolio simulations", byType.main)}
          {card("Trading wallet", "Intraday & swing simulations", byType.trading)}
          {card("Affiliate wallet", "Simulated payouts", byType.affiliate)}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-semibold">Tips</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-400 space-y-1">
            <li>If you see “not created”, your bootstrap didn’t run yet—sign out and sign in again.</li>
            <li>Wallet types are read from <code className="text-slate-200">currencyType</code> (main/trading/affiliate).</li>
          </ul>
        </section>
      </main>
    </UnverifiedEmailGate>
  );
}

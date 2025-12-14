"use client";

import UnverifiedEmailGate from "../../components/UnverifiedEmailGate";
import { useEffect, useState } from "react";
import { getCurrentUser, getUserWallets } from "../../lib/api";
import { useRouter } from "next/navigation";

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) return router.replace("/signin");
      setUser(u);
      try {
        const w = await getUserWallets(u.$id);
        setWallets(w || []);
      } catch (e) {
        setErr(e?.message || "Failed to load wallets");
      }
    })();
  }, [router]);

  return (
    <UnverifiedEmailGate>
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Wallets</h1>
        <p className="text-sm text-slate-400">Your educational balances.</p>

        {err && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {err}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          {(wallets || []).map((w) => (
            <div key={w.$id || w.walletId} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs uppercase text-slate-400">{w.currencyType}</div>
              <div className="mt-1 text-2xl font-semibold">${Number(w.balance || 0).toLocaleString()}</div>
              <div className="mt-1 text-xs text-slate-500">Active: {String(w.isActive)}</div>
            </div>
          ))}
          {wallets?.length === 0 && !err && (
            <div className="text-sm text-slate-400">No wallets found yet (bootstrap may not have run).</div>
          )}
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

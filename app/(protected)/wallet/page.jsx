"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import BlotterTable from "../../../components/BlotterTable";
import AvatarModal from "../../../components/AvatarModal";
import AppShellPro from "../../../components/AppShellPro";
import {
  getCurrentUser,
  getUserWallets,
  getUserTransactions,
  getUserProfile,
} from "../../../lib/api";

const money = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function CardWallet({ title, subtitle, amount, profile, accent = "amber" }) {
  const border =
    accent === "cyan"
      ? "border-cyan-500/20"
      : accent === "violet"
      ? "border-violet-500/20"
      : "border-amber-500/20";

  const glow =
    accent === "cyan"
      ? "from-cyan-500/20 via-slate-900/20 to-transparent"
      : accent === "violet"
      ? "from-violet-500/20 via-slate-900/20 to-transparent"
      : "from-amber-500/20 via-slate-900/20 to-transparent";

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${border} bg-slate-900/50`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${glow}`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">{subtitle}</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{title}</div>
          </div>
          <AvatarModal profile={profile} />
        </div>

        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-widest text-slate-400">Balance</div>
          <div className="mt-1 text-3xl font-semibold text-slate-100">{money(amount)}</div>
        </div>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <div className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1">DT • Secure</div>
          <div className="tracking-widest">•••• •••• •••• 9013</div>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [txs, setTxs] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;

        setMe(u);
        const [p, ws, t] = await Promise.all([
          getUserProfile(u.$id).catch(() => null),
          getUserWallets(u.$id),
          getUserTransactions(u.$id),
        ]);

        if (!cancel) {
          setProfile(p);
          setWallets(ws || []);
          setTxs(t || []);
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load wallets.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  const byType = useMemo(() => {
    const map = { main: null, trading: null, affiliate: null };
    (wallets || []).forEach((w) => {
      if (w?.currencyType && map[w.currencyType] == null) map[w.currencyType] = w;
    });
    return map;
  }, [wallets]);

  const recent = useMemo(() => {
    return [...(txs || [])]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.$createdAt).getTime() -
          new Date(a.createdAt || a.$createdAt).getTime()
      )
      .slice(0, 15);
  }, [txs]);

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>;
  if (!me) return null;

  return (
    <AppShellPro rightSlot={<AvatarModal profile={profile} />}>
      <UnverifiedEmailGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Wallets</h1>
            <p className="text-sm text-slate-400">Balances and activity.</p>
          </div>

          {err ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {err}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <CardWallet
              title="Main"
              subtitle="Account"
              amount={byType.main?.balance}
              profile={profile}
              accent="amber"
            />
            <CardWallet
              title="Trading"
              subtitle="Account"
              amount={byType.trading?.balance}
              profile={profile}
              accent="cyan"
            />
            <CardWallet
              title="Affiliate"
              subtitle="Account"
              amount={byType.affiliate?.balance}
              profile={profile}
              accent="violet"
            />
          </div>

          <BlotterTable title="Recent Transaction History" rows={recent} />
        </div>
      </UnverifiedEmailGate>
    </AppShellPro>
  );
}

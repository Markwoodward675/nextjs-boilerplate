// app/wallet/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, getUserWallets } from "../../lib/api";

export default function WalletPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("dt_avatar");
      if (stored) setAvatarSrc(stored);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/wallet");
        return;
      }
      setUser(u);
      setChecking(false);

      try {
        const w = await getUserWallets(u.$id);
        if (!mounted) return;
        setWallets(w);
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  const main = wallets.find((w) => w.type === "main");
  const trading = wallets.find((w) => w.type === "trading");
  const affiliate = wallets.find((w) => w.type === "affiliate");

  const avatarInitials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "DT";

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      {/* Card-style wallet header */}
      <section>
        <div className="text-[11px] text-slate-400 mb-2">
          Wallet overview
        </div>
        <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/80 px-4 py-4 shadow-lg overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border border-emerald-500/40 opacity-40" />
          <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full border border-blue-500/40 opacity-30" />

          <div className="relative flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                Day Trader · Multi-wallet
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-50">
                {main ? (main.balance || 0).toFixed(2) : "0.00"} USD
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Main wallet balance · tap into Trade & Invest to allocate.
              </p>
            </div>
            <button
              onClick={() => setAvatarModalOpen(true)}
              className="flex flex-col items-center gap-1"
            >
              <div className="h-10 w-10 rounded-full border border-slate-600 bg-slate-900/80 overflow-hidden flex items-center justify-center text-[11px] font-semibold text-slate-100">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarInitials
                )}
              </div>
              <span className="text-[10px] text-slate-400">
                {user?.name || "Trader"}
              </span>
            </button>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">Trading</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {trading ? (trading.balance || 0).toFixed(2) : "0.00"} USD
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">Affiliate</div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {affiliate ? (affiliate.balance || 0).toFixed(2) : "0.00"} USD
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 px-3 py-2">
              <div className="text-[10px] text-slate-500">
                Returns (admin)
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-50">
                {main?.investmentReturnsBalance
                  ? main.investmentReturnsBalance.toFixed(2)
                  : "0.00"}{" "}
                USD
              </div>
            </div>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-[10px] text-red-400">
            Unable to load wallets: {error}
          </p>
        )}
      </section>

      {/* Allocation explanation */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Allocation discipline
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Keep risk capital, affiliate earnings, and investment returns
            compartmentalized so each stream has a specific role.
          </p>
        </Card>
        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Withdrawals & payouts
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            When you&apos;re ready to pay yourself, use Withdraw with a clear
            cadence instead of reacting emotionally to P&amp;L swings.
          </p>
        </Card>
      </section>

      {/* Avatar modal */}
      {avatarModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
          onClick={() => setAvatarModalOpen(false)}
        >
          <div
            className="rounded-3xl bg-slate-950 border border-slate-700/80 px-4 py-4 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-semibold text-slate-100">
              Profile picture
            </h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Manage your avatar in Settings. It will appear on wallet cards
              and dashboards.
            </p>
            <div className="mt-3 flex justify-center">
              <div className="h-24 w-24 rounded-full border border-slate-600 bg-slate-900 overflow-hidden flex items-center justify-center text-lg font-semibold text-slate-100">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarInitials
                )}
              </div>
            </div>
            <button
              onClick={() => setAvatarModalOpen(false)}
              className="mt-4 w-full rounded-full bg-slate-800 px-4 py-2 text-[11px] text-slate-100 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

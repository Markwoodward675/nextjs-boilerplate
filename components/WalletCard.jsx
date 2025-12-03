"use client";

import { useState } from "react";

export default function WalletCard({ wallet, avatarUrl }) {
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const lastFour = wallet.$id?.slice(-4) || "0000";
  const label =
    wallet.type === "affiliate"
      ? "Affiliate Wallet"
      : wallet.type === "trading"
      ? "Trading Wallet"
      : "Main Wallet";

  const initials = "DT";

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 px-4 py-4">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-700/20" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-emerald-600/10" />

        {/* Avatar button */}
        <div className="absolute top-3 right-3">
          <button
            type="button"
            onClick={() => avatarUrl && setShowAvatarModal(true)}
            className="h-8 w-8 rounded-full border border-slate-600 bg-slate-900 overflow-hidden flex items-center justify-center text-[10px] text-slate-200"
            title={
              avatarUrl ? "View profile picture" : "No profile picture yet"
            }
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </button>
        </div>

        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {label}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              {wallet.currency} · {wallet.status || "active"}
            </div>
          </div>
          <div className="h-7 w-10 rounded-xl border border-slate-500/50 flex items-center justify-center text-[9px] font-semibold text-slate-200">
            DAY
          </div>
        </div>

        <div className="relative mt-4 flex items-end justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-[0.16em]">
              Available balance
            </div>
            <div className="mt-1 text-2xl font-semibold text-blue-200">
              {Number(wallet.balance || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}{" "}
              <span className="text-sm text-slate-300">
                {wallet.currency}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Wallet ID</div>
            <div className="mt-1 text-xs font-mono text-slate-200">
              **** **** **** {lastFour}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar modal */}
      {showAvatarModal && avatarUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
          <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 max-w-xs w-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-100">
                Profile picture
              </p>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="h-7 w-7 rounded-full border border-slate-700 flex items-center justify-center text-xs text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
              <img
                src={avatarUrl}
                alt="Profile full"
                className="max-h-[260px] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

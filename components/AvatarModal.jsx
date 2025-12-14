"use client";

import { useMemo, useState } from "react";

export default function AvatarModal({ profile }) {
  const [open, setOpen] = useState(false);

  const initials = useMemo(() => {
    const n = (profile?.displayName || profile?.fullName || "DT").trim();
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join("") || "DT";
  }, [profile]);

  const img = profile?.profileImageUrl || "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-amber-500/25 bg-slate-950/40 text-xs font-semibold text-amber-200 hover:bg-slate-900/60 transition"
        aria-label="Open profile"
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="text-sm font-semibold text-slate-100">Profile</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/70 transition"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/40">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-amber-200">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-100">
                    {profile?.displayName || profile?.fullName || "User"}
                  </div>
                  <div className="truncate text-sm text-slate-400">
                    {profile?.email || ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    @{profile?.username || "username"}
                  </div>
                </div>
              </div>

              {img ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="Profile preview" className="w-full object-cover" />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4 text-sm text-slate-300">
                  No profile picture uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

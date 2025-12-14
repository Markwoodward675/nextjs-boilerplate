"use client";

import { useMemo, useState } from "react";

function initialsFrom(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase();
}

export default function AvatarModal({ profile }) {
  const [open, setOpen] = useState(false);

  const displayName =
    profile?.displayName || profile?.fullName || profile?.username || "User";

  const imageUrl = profile?.profileImageUrl || profile?.profileImage || "";
  const initials = useMemo(() => initialsFrom(displayName), [displayName]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 w-10 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/70 transition flex items-center justify-center overflow-hidden"
        aria-label="Open profile preview"
        title="Profile"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-slate-200">{initials}</span>
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <div className="text-sm font-semibold text-slate-100">Profile</div>
                <div className="text-xs text-slate-500">{displayName}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/70 transition"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                <div className="aspect-[4/3] flex items-center justify-center bg-slate-950/40">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-slate-200">{initials}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 text-xs text-slate-500">
                  To change your picture, go to <span className="text-slate-200">Settings</span>.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

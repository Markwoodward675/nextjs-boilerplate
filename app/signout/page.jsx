"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "../../lib/api";

const BG =
  "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80";
const ICON_SRC = "/icon.png";

export default function SignoutPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await signOut();
      } finally {
        if (!cancelled) {
          setDone(true);
          router.replace("/signin");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black bg-cover bg-center px-4"
      style={{ backgroundImage: `url('${BG}')` }}
    >
      <div className="w-full max-w-md bg-black/80 border border-yellow-500/80 rounded-2xl p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-center gap-3">
          <img
            src={ICON_SRC}
            alt="Day Trader"
            className="h-10 w-10 rounded-xl border border-yellow-500/50 bg-black/60 p-1"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="text-center">
            <div className="text-2xl font-extrabold text-yellow-400 leading-tight">
              Day Trader
            </div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-yellow-200/80">
              Markets • Wallets • Execution
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-200 font-semibold">Signing you out</p>
          <p className="text-gray-300 text-sm mt-1">
            {done ? "Redirecting to sign in…" : "Closing your session securely…"}
          </p>
        </div>
      </div>
    </div>
  );
}

// components/SignOutButton.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "../lib/api";

export default function SignOutButton({ variant = "link" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    if (loading) return;
    setLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
      router.replace("/auth/login");
    }
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1.5 text-[11px] text-slate-200 hover:border-red-400 hover:text-red-300 disabled:opacity-60"
      >
        ⎋ {loading ? "Signing out…" : "Sign out"}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-[11px] text-slate-400 hover:text-red-300 disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}

// components/SignOutButton.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "../lib/api";

/**
 * A reusable sign-out button that logs the user out
 * and sends them back to /signin so they can switch accounts.
 *
 * Props:
 * - variant: "button" | "link" (default "button")
 * - className: extra CSS classes
 * - children: optional custom label
 */
export default function SignOutButton({
  variant = "button",
  className = "",
  children,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error("Sign out error:", err);
      // best-effort, still continue to /signin
    } finally {
      setLoading(false);
      router.replace("/signin");
    }
  };

  const label = loading ? "Signing out…" : children || "Sign out & switch";

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={loading}
        className={`text-xs text-slate-300 hover:text-rose-300 underline underline-offset-4 disabled:opacity-60 ${className}`}
      >
        {label}
      </button>
    );
  }

  // default: button
  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={`rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800 transition disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  );
}

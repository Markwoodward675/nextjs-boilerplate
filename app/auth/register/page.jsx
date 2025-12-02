"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account, IDHelper } from "../../../lib/appwrite";
import { initUserAfterSignup } from "../../../lib/api";

// Force this page to be dynamic so Next doesn't try to prerender it
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Read ?ref= from window.location (no useSearchParams at all)
  useEffect(() => {
    let fromUrl = null;

    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        fromUrl = url.searchParams.get("ref");
      } catch {
        fromUrl = null;
      }
    }

    if (fromUrl) {
      setReferralCode(fromUrl);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("daytrader_ref_code", fromUrl);
      }
    } else if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("daytrader_ref_code");
      if (saved) setReferralCode(saved);
    }
  }, []);

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await account.create(
        IDHelper.unique(),
        form.email,
        form.password,
        form.name
      );
      await account.createEmailSession(form.email, form.password);

      await initUserAfterSignup(referralCode || null);

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-blue-100">
          Create your Day Trader account
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Secure access to your trading tools, wallets, and affiliate
          dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-300">Full name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {referralCode && (
            <div className="text-[11px] text-emerald-400">
              Referral code detected:{" "}
              <span className="font-mono">{referralCode}</span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}

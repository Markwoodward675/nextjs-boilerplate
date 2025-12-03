"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "../../../lib/appwrite";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await account.createEmailSession(form.email, form.password);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      if (typeof window === "undefined") return;
      const origin = window.location.origin;
      await account.createOAuth2Session(
        "google",
        `${origin}/dashboard`,
        `${origin}/auth/login`
      );
      // Appwrite will redirect the browser; no router.push needed here.
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Unable to start Google sign-in. Check Google provider in Appwrite."
      );
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-blue-100">Sign in</h1>
        <p className="mt-1 text-xs text-slate-400">
          Access your Day Trader dashboards, wallets, and affiliate center.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
            or
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="mt-3 w-full rounded-full border border-slate-700 bg-slate-950 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900 disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          <span className="text-[13px]">🔐</span>
          <span>
            {googleLoading
              ? "Connecting Google…"
              : "Continue with Google"}
          </span>
        </button>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          Don&apos;t have an account yet?{" "}
          <a href="/auth/register" className="text-blue-400 hover:text-blue-300">
            Create one
          </a>
          .
        </p>
      </div>
    </main>
  );
}

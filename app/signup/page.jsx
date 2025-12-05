// app/signup/page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      const { user, autoLoginSucceeded } = await registerUser({
        fullName,
        email,
        password,
      });

      // If auto-login worked, send them straight to dashboard
      if (autoLoginSucceeded) {
        router.replace("/dashboard");
        return;
      }

      // If auto-login failed, keep them here and clearly explain what to do
      setInfo(
        "Account created successfully. Please sign in with your email and password to continue."
      );
    } catch (err) {
      setError(
        err?.message ||
          "There was an error processing your request. Please check the inputs and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToSignIn = () => {
    router.push("/signin");
  };

  return (
    <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
        {/* Brand header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-sm font-semibold text-emerald-300">
            DT
          </div>
          <div>
            <p className="text-[11px] uppercase text-slate-500 tracking-wide">
              Day Trader
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              Create your account
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Set up your Day Trader profile to start using educational wallets and
          trading simulations.
        </p>

        {/* Info + error banners */}
        {info && (
          <div className="mb-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {info}
            <div className="mt-2">
              <button
                type="button"
                onClick={handleGoToSignIn}
                className="text-[11px] font-medium underline underline-offset-4 hover:text-emerald-100"
              >
                Go to sign in
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1 text-sm">
            <label className="block text-slate-300" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder="Dialed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="block text-slate-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="block text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/30 transition disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/signin")}
            className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
          >
            Sign in
          </button>
        </p>
      </div>
    </main>
  );
}

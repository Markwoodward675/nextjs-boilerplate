"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "../../lib/api";

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => email.trim() && password, [email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signIn(email.trim(), password);
      router.replace("/verify-code");
    } catch (e2) {
      const msg = e2?.message || "Unable to sign in.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black bg-[url('https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center px-4">
      <div className="w-full max-w-md bg-black/80 border border-yellow-500 rounded-xl p-6 shadow-lg backdrop-blur">
        <h1 className="text-3xl font-bold text-yellow-400 text-center">
          Day Trader
        </h1>
        <p className="text-gray-300 text-center mt-2">
          Welcome back. Sign in to continue.
        </p>

        {err ? (
          <div className="mt-4 bg-red-600/20 border border-red-500 text-red-200 p-3 rounded">
            {err}
          </div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">Email</label>
            <input
              className="w-full p-3 rounded bg-black/50 text-white border border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">
              Password
            </label>
            <input
              className="w-full p-3 rounded bg-black/50 text-white border border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            className="w-full p-3 rounded bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!can || busy}
            type="submit"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-gray-300 text-center text-sm">
            New here?{" "}
            <a className="text-yellow-400 hover:underline" href="/signup">
              Create an account
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

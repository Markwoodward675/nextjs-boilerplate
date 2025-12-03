"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../../components/Card";
import { loginWithEmailPassword } from "../../../lib/api";
import { account } from "../../../lib/appwrite";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nextUrl, setNextUrl] = useState("/dashboard");

  // Read ?next=/something from URL without useSearchParams
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const params = new URLSearchParams(window.location.search);
      const n = params.get("next");
      if (n) {
        setNextUrl(n);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await loginWithEmailPassword(email, password);
      router.replace(nextUrl);
    } catch (err) {
      console.error("Login error:", err);

      const msg =
        err?.message ||
        err?.response?.message ||
        (typeof err === "string" ? err : JSON.stringify(err));

      if (
        msg.includes("Failed to fetch") ||
        msg.includes("Network request failed")
      ) {
        setError(
          "Network / Appwrite error: " +
            msg +
            ". Check NEXT_PUBLIC_APPWRITE_ENDPOINT & internet connection."
        );
      } else {
        // Show Appwrite's message directly so we see what's wrong
        setError("Appwrite: " + msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");

    if (typeof window === "undefined") return;

    try {
      const configuredAppUrl =
        process.env.NEXT_PUBLIC_APP_URL || "";
      const currentOrigin = window.location.origin;

      if (configuredAppUrl && !currentOrigin.startsWith(configuredAppUrl)) {
        setError(
          `Please open Day Trader on ${configuredAppUrl} to use Google sign-in. You are currently on ${currentOrigin}.`
        );
        return;
      }

      const base = configuredAppUrl || currentOrigin;

      const successUrl = `${base}${nextUrl}`;
      const failureUrl = `${base}/auth/login?oauth=failed`;

      await account.createOAuth2Session("google", successUrl, failureUrl);
    } catch (err) {
      console.error("Google OAuth error:", err);
      const msg =
        err?.message ||
        err?.response?.message ||
        (typeof err === "string" ? err : JSON.stringify(err));
      setError("Google OAuth error: " + msg);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 pb-16 md:pb-6">
      <div className="w-full max-w-sm">
        <Card>
          <h1 className="text-sm font-semibold text-slate-100">
            Sign in
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Access your Day Trader dashboards, wallets, and affiliate center.
          </p>

          {error && (
            <p className="mt-3 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-full bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in with email"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-500">
            <div className="h-px flex-1 bg-slate-800" />
            <span>OR</span>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-500 flex items-center justify-center gap-2"
          >
            <span role="img" aria-label="lock">
              🔐
            </span>
            <span>Continue with Google</span>
          </button>

          <p className="mt-4 text-[11px] text-slate-500 text-center">
            Don&apos;t have an account yet?{" "}
            <button
              type="button"
              className="text-blue-400 hover:text-blue-300"
              onClick={() => router.push("/auth/register")}
            >
              Create one.
            </button>
          </p>
        </Card>
      </div>
    </main>
  );
}

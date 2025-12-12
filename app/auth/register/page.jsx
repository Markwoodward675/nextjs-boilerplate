"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  registerUser,
  getCurrentUser,
  logoutUser,
} from "../../lib/api";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [existingUser, setExistingUser] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if someone is already signed in
  useEffect(() => {
    async function checkUser() {
      try {
        const user = await getCurrentUser();
        setExistingUser(user);
      } catch {
        setExistingUser(null);
      } finally {
        setCheckingExisting(false);
      }
    }
    checkUser();
  }, []);

  async function handleSignOutAndSwitch() {
    setError("");
    setInfo("");
    try {
      await logoutUser();
    } catch {
      // ignore logout errors
    }
    setExistingUser(null);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      await registerUser({
        fullName,
        email,
        password,
      });

      setInfo(
        "Account created successfully. Please sign in with your email and password to continue. A verification link will be sent to your email after you sign in."
      );

      // Clear form
      setFullName("");
      setEmail("");
      setPassword("");
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

  if (checkingExisting) {
    return (
      <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
          Checking your session…
        </div>
      </main>
    );
  }

  if (existingUser) {
    return (
      <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_0_40px_rgba(15,23,42,0.9)] text-sm">
          <div className="mb-3">
            <p className="text-[11px] uppercase text-slate-500 tracking-wide mb-1">
              Day Trader
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              You&apos;re already signed in
            </h1>
          </div>
          <p className="text-slate-300 mb-3">
            You&apos;re currently signed in as{" "}
            <span className="font-medium text-emerald-300">
              {existingUser.email}
            </span>
            . If you want to create a new account, sign out and switch accounts
            first.
          </p>
          <button
            type="button"
            onClick={handleSignOutAndSwitch}
            className="w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-50 hover:bg-emerald-500/30 transition"
          >
            Sign out &amp; switch account
          </button>

          <p className="mt-4 text-[11px] text-slate-500 text-center">
            Or go back to your{" "}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="underline underline-offset-4 text-emerald-300 hover:text-emerald-200"
            >
              dashboard
            </button>
            .
          </p>
        </div>
      </main>
    );
  }

  // Pure email/password signup
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
              Create your Day Trader account
            </h1>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-1">
          Secure access to your trading tools, wallets, and affiliate dashboard.
        </p>
        <p className="text-[11px] text-amber-200 mb-4">
          A verification link will be sent to your email. You&apos;ll need to
          verify before unlocking all dashboard features.
        </p>

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
              placeholder="Kris Malcom"
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
            <p className="mt-1 text-[11px] text-slate-500">
              Tip: Appwrite default is at least 8 characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/30 transition disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account with email"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <button
            type="button"
            onClick={handleGoToSignIn}
            className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
          >
            Sign in
          </button>
          .
        </p>
      </div>
    </main>
  );
}

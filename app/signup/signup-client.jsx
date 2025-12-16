"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { registerUser } from "../../lib/api";

function cn(...a) {
  return a.filter(Boolean).join(" ");
}

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const ref = sp.get("ref"); // optional affiliate ref
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = password;
    const n = fullName.trim();
    return n.length >= 2 && e.includes("@") && p.length >= 8;
  }, [fullName, email, password]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await registerUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        referrerAffiliateId: ref ? Number(ref) : undefined, // harmless if unused
      });

      // Main gate is verify-code
      router.replace("/verify-code");
    } catch (err) {
      const msg =
        err?.message ||
        (typeof err === "string" ? err : "Network request failed");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070A0F] text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-5 py-10 md:grid-cols-2 md:py-16">
        {/* Left: brand panel */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 md:p-10">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <span className="text-sm font-semibold tracking-wide">DT</span>
            </div>
            <div>
              <div className="text-xl font-semibold leading-tight">Day Trader</div>
              <div className="text-sm text-white/60">Markets • Wallets • Execution</div>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            <div className="text-3xl font-semibold leading-tight">
              Create your account
            </div>
            <div className="text-white/65">
              Secure access to your dashboard and services.
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-medium">Verification</div>
            <div className="mt-1 text-sm text-white/65">
              After signup you’ll verify with a 6-digit code to unlock access.
            </div>
          </div>

          <div className="mt-8 text-xs text-white/45">
            By continuing, you agree to our terms and policies.
          </div>
        </div>

        {/* Right: form */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10">
          <form onSubmit={onSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
                <div className="mt-2 text-xs text-red-100/70">
                  If you see a CORS error, add this domain in Appwrite Platforms.
                </div>
              </div>
            ) : null}

            <div>
              <label className="text-sm text-white/70">Full name</label>
              <input
                className={cn(
                  "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none",
                  "focus:border-white/20 focus:ring-2 focus:ring-white/10"
                )}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">Email</label>
              <input
                className={cn(
                  "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none",
                  "focus:border-white/20 focus:ring-2 focus:ring-white/10"
                )}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">Password</label>
              <input
                type="password"
                className={cn(
                  "mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none",
                  "focus:border-white/20 focus:ring-2 focus:ring-white/10"
                )}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
              <div className="mt-2 text-xs text-white/45">
                Minimum 8 characters.
              </div>
            </div>

            <button
              disabled={!canSubmit || busy}
              className={cn(
                "w-full rounded-2xl px-4 py-3 text-sm font-semibold",
                "bg-white text-black hover:bg-white/90",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              type="submit"
            >
              {busy ? "Creating account..." : "Create account"}
            </button>

            <div className="pt-2 text-center text-sm text-white/60">
              Already have an account?{" "}
              <a className="text-white hover:underline" href="/signin">
                Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

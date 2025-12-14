"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getUserProfile,
  resendVerificationEmail,
  getErrorMessage,
} from "../lib/api";

export default function UnverifiedEmailGate({ children }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verified, setVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/signin");
          return;
        }

        setUserEmail(user.email || "");

        const profile = await getUserProfile();

        if (profile?.verificationCodeVerified === true) {
          setVerified(true);
        }
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to check verification status."
          )
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleResendEmail() {
    setError("");
    setInfo("");
    try {
      await resendVerificationEmail();
      setInfo("Verification email sent. Check your inbox or spam.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to resend email."));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-slate-300">
        Checking verification…
      </main>
    );
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm">
        <p className="text-[11px] uppercase text-slate-500 tracking-wide mb-1">
          Day Trader
        </p>
        <h1 className="text-lg font-semibold mb-2">
          Verify your account
        </h1>

        <p className="text-slate-300 mb-4">
          Your account must be verified with a 6-digit code before accessing
          the dashboard.
        </p>

        <button
          onClick={() => router.push("/verify-code")}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition"
        >
          Enter verification code
        </button>

        <div className="mt-4 text-[11px] text-slate-500">
          Signed in as{" "}
          <span className="text-emerald-300">{userEmail}</span>
        </div>

        <div className="mt-4 border-t border-slate-800 pt-4">
          <p className="text-[11px] text-slate-400 mb-2">
            Didn’t receive the email link? (optional)
          </p>
          <button
            onClick={handleResendEmail}
            className="w-full rounded-xl border border-slate-700 px-4 py-2 text-xs hover:bg-slate-800 transition"
          >
            Resend email verification
          </button>
        </div>

        {info && (
          <div className="mt-3 text-[11px] text-emerald-300">{info}</div>
        )}
        {error && (
          <div className="mt-3 text-[11px] text-rose-300">{error}</div>
        )}
      </div>
    </main>
  );
}

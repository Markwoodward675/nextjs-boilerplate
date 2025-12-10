// app/verify/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "../../lib/appwrite";
import { resendVerificationEmail } from "../../lib/api";

export const dynamic = "force-dynamic";

function getErrorMessage(err, fallback) {
  if (!err) return fallback;
  const anyErr = /** @type {any} */ (err);
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;
  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}

async function updateVerificationCompat(userId, secret) {
  const anyAccount = /** @type {any} */ (account);

  if (typeof anyAccount.updateVerification === "function") {
    try {
      // New SDK style
      return await anyAccount.updateVerification({ userId, secret });
    } catch {
      // Old SDK style
      return await anyAccount.updateVerification(userId, secret);
    }
  }

  throw new Error(
    "This Appwrite SDK version does not support updateVerification."
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error" | "info"
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const emailParam = searchParams.get("email");

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    // Case 1: Real verification link (userId + secret)
    if (userId && secret) {
      let cancelled = false;

      async function run() {
        try {
          await updateVerificationCompat(userId, secret);
          if (cancelled) return;

          setStatus("success");
          setMessage(
            "Your email has been verified successfully. You can now access your Day Trader dashboard."
          );

          setTimeout(() => {
            if (!cancelled) {
              router.replace("/dashboard");
            }
          }, 2000);
        } catch (err) {
          if (cancelled) return;
          setStatus("error");
          setMessage(
            getErrorMessage(
              err,
              "This verification link is invalid, expired, or has already been used."
            )
          );
        }
      }

      run();
      return () => {
        cancelled = true;
      };
    }

    // Case 2: No userId/secret – show "check your email" state instead of hard error
    setStatus("info");
    if (emailParam) {
      setMessage(
        `Check your email (${emailParam}) for a verification link. Once you verify, you can sign in and access your dashboard.`
      );
    } else {
      setMessage(
        "Check your email for a verification link we sent after you signed up. Once you verify, you can sign in and access your Day Trader dashboard."
      );
    }
  }, [router, searchParams, emailParam]);

  const isVerifying = status === "verifying";
  const isSuccess = status === "success";
  const isError = status === "error";
  const isInfo = status === "info";

  const handleResend = async () => {
    setSending(true);
    setResendMessage("");
    setResendError("");

    try {
      await resendVerificationEmail();
      setResendMessage(
        "Verification email sent. Please check your inbox (and spam folder)."
      );
    } catch (err) {
      setResendError(
        getErrorMessage(
          err,
          "Could not resend verification email. Please try again in a moment."
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-sm font-semibold">
            DT
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 tracking-wide">
              Day Trader
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              Email verification
            </h1>
          </div>
        </div>

        {isVerifying && (
          <p className="text-sm text-slate-300">
            We&apos;re verifying your email… Please wait a moment.
          </p>
        )}

        {isSuccess && (
          <p className="text-sm text-emerald-300 mb-2">{message}</p>
        )}

        {isError && <p className="text-sm text-rose-300 mb-2">{message}</p>}

        {isInfo && (
          <p className="text-sm text-slate-300 mb-2">
            {message || "Check your email for a verification link."}
          </p>
        )}

        {!isVerifying && (
          <>
            <p className="mt-2 text-xs text-slate-500">
              You&apos;ll be redirected to your dashboard automatically if
              you opened this from a verification link. If nothing happens, use
              the buttons below.
            </p>

            {/* Resend button for info / error states (not during active verify) */}
            {(isInfo || isError) && (
              <div className="mt-4">
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleResend}
                  className="w-full rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/20 transition disabled:opacity-60"
                >
                  {sending ? "Resending verification email…" : "Resend verification email"}
                </button>
                {resendMessage && (
                  <p className="mt-2 text-[11px] text-emerald-200">
                    {resendMessage}
                  </p>
                )}
                {resendError && (
                  <p className="mt-2 text-[11px] text-rose-200">{resendError}</p>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => router.replace("/signin")}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 transition"
              >
                Go to sign in
              </button>
              <button
                type="button"
                onClick={() => router.replace("/dashboard")}
                className="flex-1 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/20 transition"
              >
                Go to dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
            <h1 className="text-lg font-semibold text-slate-50 mb-2">
              Email verification
            </h1>
            <p className="text-sm text-slate-300">
              We&apos;re preparing your verification page…
            </p>
          </div>
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

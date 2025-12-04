// app/verify/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "../../lib/appwrite";

// Optional: avoid static prerender headaches for this page
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
  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      setMessage("Invalid verification link. Missing userId or secret.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        await updateVerificationCompat(userId, secret);
        if (cancelled) return;

        setStatus("success");
        setMessage(
          "Your email has been verified successfully. You can now access your Day Trader dashboard."
        );

        // Redirect to dashboard after a short delay
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
  }, [router, searchParams]);

  const isVerifying = status === "verifying";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className="min-h-[80vh] bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-slate-50 mb-2">
          Email verification
        </h1>

        {isVerifying && (
          <p className="text-sm text-slate-300">
            We&apos;re verifying your email… Please wait a moment.
          </p>
        )}

        {isSuccess && (
          <p className="text-sm text-emerald-300 mb-3">{message}</p>
        )}

        {isError && (
          <p className="text-sm text-rose-300 mb-3">{message}</p>
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

        {isSuccess && (
          <p className="mt-2 text-[11px] text-slate-500">
            You&apos;ll be redirected automatically to your dashboard in a
            moment.
          </p>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  // Wrap the hook-using content in Suspense to satisfy Next.js requirement
  return (
    <Suspense
      fallback={
        <main className="min-h-[80vh] bg-slate-950 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <h1 className="text-xl font-semibold text-slate-50 mb-2">
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

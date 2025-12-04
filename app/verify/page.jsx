// app/verify/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "../../lib/appwrite";

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

        <p className="mt-2 text-xs text-slate-500">
          You&apos;ll be redirected to your dashboard automatically. If nothing
          happens, use the buttons below.
        </p>

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

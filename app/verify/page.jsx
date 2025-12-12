// app/verify/page.jsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "../../lib/appwrite";

export const dynamic = "force-dynamic";

function getErrorMessage(err, fallback) {
  if (!err) return fallback;
  const anyErr = err;
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;
  try { return JSON.stringify(anyErr); } catch { return fallback; }
}

async function updateVerificationCompat(userId, secret) {
  const anyAccount = account;

  if (typeof anyAccount.updateVerification === "function") {
    try {
      return await anyAccount.updateVerification({ userId, secret });
    } catch {
      return await anyAccount.updateVerification(userId, secret);
    }
  }
  throw new Error("This Appwrite SDK version does not support updateVerification.");
}

function VerifyContent() {
  const router = useRouter();
  const sp = useSearchParams();

  const [state, setState] = useState("info"); // info | verifying | success | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const userId = sp.get("userId");
    const secret = sp.get("secret");
    const email = sp.get("email");

    // If email-link params exist, verify email (OPTIONAL step)
    if (userId && secret) {
      let cancelled = false;
      setState("verifying");
      setMsg("Verifying your email…");

      (async () => {
        try {
          await updateVerificationCompat(userId, secret);
          if (cancelled) return;
          setState("success");
          setMsg("Email verified successfully. Next: verify your 6-digit code to unlock the dashboard.");
        } catch (err) {
          if (cancelled) return;
          setState("error");
          setMsg(getErrorMessage(err, "This link is invalid/expired or already used. You can still continue to code verification."));
        }
      })();

      return () => { cancelled = true; };
    }

    // No link params → just info
    setState("info");
    if (email) {
      setMsg(`Check your email (${email}) for the link (optional). Your main unlock is the 6-digit code verification.`);
    } else {
      setMsg("Email-link verification is optional. Your main unlock is the 6-digit code verification.");
    }
  }, [sp]);

  return (
    <main className="min-h-[100vh] bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
        <h1 className="text-lg font-semibold text-slate-50">Email verification (optional)</h1>
        <p className="mt-2 text-sm text-slate-300">{msg}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => router.replace("/verify-code")}
            className="flex-1 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500/20"
          >
            Continue to code verification
          </button>
          <button
            type="button"
            onClick={() => router.replace("/signin")}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Sign in
          </button>
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          The dashboard unlock depends on 6-digit code verification, not email-link verification.
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-[100vh] bg-slate-950" />}>
      <VerifyContent />
    </Suspense>
  );
}

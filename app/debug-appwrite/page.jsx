// app/debug-appwrite/page.jsx
"use client";

import { useEffect, useState } from "react";
import { account } from "../../lib/appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "Daytrader_main";

export default function DebugAppwritePage() {
  const [healthStatus, setHealthStatus] = useState("Checking...");
  const [healthError, setHealthError] = useState("");
  const [accountStatus, setAccountStatus] = useState("Checking...");
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    // 1) Raw fetch to /health so we see if the browser can reach the endpoint at all
    async function checkHealth() {
      if (!ENDPOINT) {
        setHealthStatus("No ENDPOINT configured.");
        setHealthError(
          "NEXT_PUBLIC_APPWRITE_ENDPOINT is missing in Vercel env."
        );
        return;
      }

      try {
        const res = await fetch(`${ENDPOINT.replace(/\/$/, "")}/health`);
        const text = await res.text();
        setHealthStatus(`HTTP ${res.status}`);
        setHealthError(text);
      } catch (err) {
        setHealthStatus("Network error");
        setHealthError(String(err));
      }
    }

    // 2) Try a simple account.get() to see if Appwrite JS client can talk
    async function checkAccount() {
      try {
        const user = await account.get();
        setAccountStatus("Success");
        setAccountError(JSON.stringify(user, null, 2));
      } catch (err) {
        setAccountStatus("Error");
        setAccountError(String(err));
      }
    }

    checkHealth();
    checkAccount();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Day Trader – Appwrite Debug</h1>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
          <h2 className="text-base font-medium mb-2 text-slate-100">
            Config seen by the browser
          </h2>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all">
            {JSON.stringify(
              { ENDPOINT, PROJECT_ID, DB_ID },
              null,
              2
            )}
          </pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
          <h2 className="text-base font-medium mb-1 text-slate-100">
            1) Raw /health fetch
          </h2>
          <p className="text-xs text-slate-400 mb-1">
            Status:{" "}
            <span className="font-mono text-emerald-300">{healthStatus}</span>
          </p>
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-slate-300">
            {healthError || "(no error text)"}
          </pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
          <h2 className="text-base font-medium mb-1 text-slate-100">
            2) Appwrite account.get()
          </h2>
          <p className="text-xs text-slate-400 mb-1">
            Status:{" "}
            <span className="font-mono text-emerald-300">{accountStatus}</span>
          </p>
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-slate-300">
            {accountError || "(no error text)"}
          </pre>
        </section>
      </div>
    </main>
  );
}

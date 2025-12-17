// app/debug-appwrite/page.jsx
"use client";

import { useEffect, useState } from "react";
import { account, isAppwriteConfigured } from "../../lib/appwrite";

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const PROJECT_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();
const DB_ID = (process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "").trim() || "Daytrader_main";

function safeJson(x) {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

export default function DebugAppwritePage() {
  const [output, setOutput] = useState("Loading...");
  const [running, setRunning] = useState(false);

  async function runTests() {
    if (running) return;
    setRunning(true);

    let result = "";
    const add = (line = "") => {
      result += line + "\n";
      setOutput(result);
    };

    add("=== Day Trader: Appwrite Debug ===");
    add("");

    add("1) Browser ENV (public):");
    add(
      safeJson({
        ENDPOINT: ENDPOINT ? `${ENDPOINT.slice(0, 40)}${ENDPOINT.length > 40 ? "…" : ""}` : "",
        PROJECT_ID: PROJECT_ID ? `${PROJECT_ID.slice(0, 10)}…` : "",
        DB_ID,
        isAppwriteConfigured,
      })
    );
    add("");

    if (!ENDPOINT || !PROJECT_ID) {
      add("❌ Appwrite not configured in this build.");
      add("Fix: Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel (Preview + Production) then redeploy.");
      setRunning(false);
      return;
    }

    // 2) Raw /health fetch (Appwrite expects /v1/health)
    add("2) Health check:");
    try {
      const base = ENDPOINT.replace(/\/$/, "");
      const url = base.endsWith("/v1") ? `${base}/health` : `${base}/v1/health`;

      add(`GET ${url}`);
      const res = await fetch(url, { method: "GET" });
      const text = await res.text().catch(() => "");
      add(`✅ Health fetch: HTTP ${res.status}`);
      add(text ? text.slice(0, 600) : "(no body)");
    } catch (err) {
      add(`❌ Health fetch error: ${String(err?.message || err)}`);
    }
    add("");

    // 3) account.get()
    add("3) account.get():");
    try {
      const user = await account.get();
      add("✅ Account.get() success:");
      add(safeJson({ $id: user?.$id, email: user?.email, emailVerification: user?.emailVerification, name: user?.name }));
    } catch (err) {
      add("❌ Account.get() error:");
      add(String(err?.message || err));
      add("");
      add("Common causes:");
      add("- Not signed in (expected if no session yet)");
      add("- Appwrite platform/domain not added in Appwrite Console → Platforms");
      add("- CORS/blocked requests if domain mismatch");
    }
    add("");

    // 4) createJWT() (optional)
    add("4) account.createJWT() (optional):");
    try {
      const jwt = await account.createJWT();
      add("✅ createJWT() success (token hidden):");
      add(safeJson({ jwtPresent: Boolean(jwt?.jwt), issuedAt: jwt?.issuedAt || null, expire: jwt?.expire || null }));
    } catch (err) {
      add("ℹ️ createJWT() not available/failed (this is ok if not signed in):");
      add(String(err?.message || err));
    }
    add("");

    add("=== Done ===");
    setRunning(false);
  }

  useEffect(() => {
    runTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#050814] p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-yellow-300 font-bold">Debug Appwrite</h1>
          <button
            type="button"
            onClick={runTests}
            disabled={running}
            className="rounded-xl border border-yellow-500/40 bg-black/50 px-3 py-1.5 text-xs font-semibold text-yellow-100 hover:bg-yellow-500/10 disabled:opacity-60"
          >
            {running ? "Running…" : "Run again"}
          </button>
        </div>

        <pre className="rounded-2xl border border-green-500/25 bg-black/50 p-4 text-xs whitespace-pre-wrap text-green-300">
          {output}
        </pre>

        <div className="mt-3 text-xs text-slate-300/80">
          Tip: If Health works but account.get fails, that usually means you’re not signed in yet, or your domain isn’t added in Appwrite Platforms.
        </div>
      </div>
    </div>
  );
}

// app/debug-appwrite/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { account, isAppwriteConfigured, createEmailSessionCompat } from "../../lib/appwrite";


const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const PROJECT_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();
const DB_ID =
  (process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "").trim() || "69399b2b00227f96c35a";

function safeJson(x) {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

function mask(s, keepStart = 6) {
  const str = String(s || "");
  if (!str) return "";
  if (str.length <= keepStart) return str;
  return str.slice(0, keepStart) + "…" + str.slice(-3);
}

export default function DebugAppwritePage() {
  const [output, setOutput] = useState("Loading...");
  const [running, setRunning] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const configError = useMemo(() => {
    if (isAppwriteConfigured) return "";
    return "Appwrite not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel (Preview + Production), then redeploy.";
  }, []);

  const addLine = (line = "") => {
    setOutput((prev) => prev + "\n" + line);
  };

  async function runHealthCheck() {
    addLine("");
    addLine("2) Health check:");
    try {
      const base = ENDPOINT.replace(/\/$/, "");
      const url = base.endsWith("/v1") ? `${base}/health` : `${base}/v1/health`;

      addLine(`GET ${url}`);
      const res = await fetch(url, { method: "GET" });
      const text = await res.text().catch(() => "");
      addLine(`✅ Health fetch: HTTP ${res.status}`);
      addLine(text ? text.slice(0, 700) : "(no body)");
    } catch (err) {
      addLine(`❌ Health fetch error: ${String(err?.message || err)}`);
    }
  }

  async function runAccountGet() {
    addLine("");
    addLine("3) account.get():");
    try {
      const user = await account.get();
      addLine("✅ Account.get() success:");
      addLine(
        safeJson({
          $id: user?.$id,
          name: user?.name,
          email: user?.email,
          emailVerification: user?.emailVerification,
          status: user?.status,
        })
      );
    } catch (err) {
      addLine("❌ Account.get() error:");
      addLine(String(err?.message || err));
      addLine("Notes:");
      addLine("- If not signed in, this is expected.");
      addLine("- If signed in but still failing, check Appwrite Platforms + CORS.");
    }
  }

  async function runCreateJwt() {
    addLine("");
    addLine("4) account.createJWT():");
    try {
      const jwt = await account.createJWT();
      addLine("✅ createJWT() success (token hidden):");
      addLine(
        safeJson({
          jwtPresent: Boolean(jwt?.jwt),
          jwtPreview: jwt?.jwt ? mask(jwt.jwt, 10) : "",
          issuedAt: jwt?.issuedAt || null,
          expire: jwt?.expire || null,
        })
      );
    } catch (err) {
      addLine("ℹ️ createJWT() failed (ok if not signed in):");
      addLine(String(err?.message || err));
    }
  }

  async function runLogout() {
    addLine("");
    addLine("5) Logout (delete current session):");
    try {
      await account.deleteSession("current");
      addLine("✅ Logged out (current session deleted).");
    } catch (err) {
      addLine("ℹ️ Logout failed (maybe no active session):");
      addLine(String(err?.message || err));
    }
  }

  async function runSignInTest() {
    addLine("");
    addLine("SIGN IN TEST:");
    if (!email.trim() || !password) {
      addLine("❌ Please enter email + password first.");
      return;
    }

    try {
      // If session already exists, Appwrite can block creating a new one.
      // Best practice: try logout first (ignore failures).
      try {
        await account.deleteSession("current");
      } catch {}

      await account.createEmailPasswordSession(email.trim(), password);
      addLine("✅ Sign in success: session created.");
      await runAccountGet();
      await runCreateJwt();
    } catch (err) {
      addLine("❌ Sign in failed:");
      addLine(String(err?.message || err));
      addLine("Common causes:");
      addLine("- Wrong email/password");
      addLine("- Domain not added in Appwrite Platforms");
      addLine("- Appwrite project requires email verification before login (depending on your flow)");
    }
  }

  async function runAll() {
    if (running) return;
    setRunning(true);

    // reset output
    setOutput("=== Day Trader: Appwrite Debug ===");

    addLine("");
    addLine("1) Browser ENV (public):");
    addLine(
      safeJson({
        endpointConfigured: Boolean(ENDPOINT),
        projectConfigured: Boolean(PROJECT_ID),
        dbConfigured: Boolean(DB_ID),
        ENDPOINT_preview: ENDPOINT ? mask(ENDPOINT, 24) : "",
        PROJECT_ID_preview: PROJECT_ID ? mask(PROJECT_ID, 10) : "",
        DB_ID,
        isAppwriteConfigured,
      })
    );

    if (!ENDPOINT || !PROJECT_ID) {
      addLine("");
      addLine("❌ Appwrite not configured in this build.");
      addLine(
        "Fix: Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel (Preview + Production) then redeploy."
      );
      setRunning(false);
      return;
    }

    await runHealthCheck();
    await runAccountGet();
    await runCreateJwt();

    addLine("");
    addLine("=== Done ===");
    setRunning(false);
  }

  useEffect(() => {
    runAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#050814] p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-yellow-300 font-bold">Debug Appwrite</h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runAll}
              disabled={running}
              className="rounded-xl border border-yellow-500/40 bg-black/50 px-3 py-1.5 text-xs font-semibold text-yellow-100 hover:bg-yellow-500/10 disabled:opacity-60"
            >
              {running ? "Running…" : "Run checks"}
            </button>

            <button
              type="button"
              onClick={runLogout}
              disabled={running || !isAppwriteConfigured}
              className="rounded-xl border border-red-500/40 bg-black/50 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/10 disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </div>

        {configError ? (
          <div className="mb-3 rounded-2xl border border-red-500/40 bg-red-600/15 p-3 text-sm text-red-100">
            {configError}
          </div>
        ) : null}

        {/* Sign in test */}
        <div className="mb-3 rounded-2xl border border-blue-500/25 bg-black/50 p-4">
          <div className="text-sm font-semibold text-blue-100 mb-3">
            Test Sign In (debug only)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dbg-email" className="block text-xs text-slate-200 mb-1">
                Email
              </label>
              <input
                id="dbg-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={!isAppwriteConfigured || running}
                className="w-full rounded-xl border border-blue-500/25 bg-black/40 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="dbg-password" className="block text-xs text-slate-200 mb-1">
                Password
              </label>
              <input
                id="dbg-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={!isAppwriteConfigured || running}
                className="w-full rounded-xl border border-blue-500/25 bg-black/40 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runSignInTest}
              disabled={!isAppwriteConfigured || running}
              className="rounded-xl border border-blue-500/35 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-500/25 disabled:opacity-60"
            >
              Test Sign In
            </button>

            <button
              type="button"
              onClick={runAccountGet}
              disabled={!isAppwriteConfigured || running}
              className="rounded-xl border border-slate-500/35 bg-black/30 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/5 disabled:opacity-60"
            >
              Test account.get()
            </button>

            <button
              type="button"
              onClick={runCreateJwt}
              disabled={!isAppwriteConfigured || running}
              className="rounded-xl border border-slate-500/35 bg-black/30 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/5 disabled:opacity-60"
            >
              Test createJWT()
            </button>
          </div>

          <div className="mt-2 text-[11px] text-slate-300/80">
            Tip: If sign-in succeeds here but fails on /signin, the issue is inside your lib/api signIn() function or routing logic.
          </div>
        </div>

        {/* Output */}
        <pre className="rounded-2xl border border-green-500/25 bg-black/50 p-4 text-xs whitespace-pre-wrap text-green-300">
          {output}
        </pre>

        <div className="mt-3 text-xs text-slate-300/80">
          If Health works but account.get fails: you’re likely not signed in yet, or your domain isn’t added in Appwrite → Platforms.
        </div>
      </div>
    </div>
  );
}

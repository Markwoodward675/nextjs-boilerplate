// app/signin/page.jsx
"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, ensureUserBootstrap, getErrorMessage } from "../../lib/api";

function SignInInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") || "";

  const nextUrl = useMemo(() => {
    // allow only internal paths
    if (!nextParam) return "";
    if (!nextParam.startsWith("/")) return "";
    if (nextParam.startsWith("//")) return "";
    return nextParam;
  }, [nextParam]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canSubmit = useMemo(() => {
    return String(email).includes("@") && String(password || "").length >= 1;
  }, [email, password]);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setMsg("");
    setBusy(true);

    try {
      // 1) Create session
      await signIn(email, password);

      // 2) Bootstrap profile/wallets (DO NOT redirect to debug on failure)
      let boot = null;
      try {
        boot = await ensureUserBootstrap();
      } catch (e2) {
        setErr(getErrorMessage(e2, "Signed in, but we couldn’t load your account data yet."));
        setBusy(false);
        return;
      }

      const verified = Boolean(boot?.profile?.verificationCodeVerified);

      // 3) Route:
      // - not verified -> /verify-code
      // - verified -> next (if provided) else /overview
      if (!verified) {
        router.replace("/verify-code");
        router.refresh();
        return;
      }

      router.replace(nextUrl || "/overview");
      router.refresh();
    } catch (e1) {
      setErr(getErrorMessage(e1, "Unable to sign in."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dt-shell dt-auth">
      <section className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="dt-kicker">Markets • Wallets • Execution</div>
            <h1 className="cardTitle" style={{ marginTop: 6 }}>
              Sign in
            </h1>
            <div className="cardSub" style={{ marginTop: 6 }}>
              Secure access to your dashboard.
            </div>
          </div>

          {err ? (
            <div className="flashError" style={{ marginTop: 12 }}>
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="flashOk" style={{ marginTop: 12 }}>
              {msg}
            </div>
          ) : null}

          <form
            className="card"
            onSubmit={onSubmit}
            style={{ marginTop: 12, display: "grid", gap: 10 }}
          >
            <div>
              <label
                htmlFor="signin-email"
                className="cardSub"
                style={{ display: "block", marginBottom: 6 }}
              >
                Email
              </label>
              <input
                id="signin-email"
                name="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>

            <div>
              <label
                htmlFor="signin-password"
                className="cardSub"
                style={{ display: "block", marginBottom: 6 }}
              >
                Password
              </label>
              <input
                id="signin-password"
                name="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={busy}
              />
            </div>

            <button className="btnPrimary" type="submit" disabled={!canSubmit || busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="cardSub" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="dt-link" href="/signup">
                Create account
              </Link>
              <span style={{ opacity: 0.55 }}>•</span>
              <Link className="dt-link" href="/forgot-password">
                Forgot password
              </Link>
            </div>
          </form>

          <div className="cardSub" style={{ marginTop: 10, opacity: 0.8 }}>
            If sign-in succeeds but your account data won’t load, it’s usually a permissions or
            collection ID issue (profiles/wallets). The exact error will show above.
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SignInPage() {
  // ✅ Fixes Next.js build error: useSearchParams must be inside Suspense
  return (
    <Suspense fallback={<div className="cardSub">Loading…</div>}>
      <SignInInner />
    </Suspense>
  );
}

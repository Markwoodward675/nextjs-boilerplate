"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, getErrorMessage } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      email.trim().length >= 5 &&
      password.length >= 8
    );
  }, [fullName, email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (!can || busy) return;

    setErr("");
    setBusy(true);

    try {
      // ✅ Correct: positional args (matches lib/api.js)
      await signUp(email.trim(), password, fullName.trim());
      router.replace("/verify-code");
    } catch (e2) {
      setErr(getErrorMessage(e2, "Unable to create account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 28 }}>
      <div className="contentCard">
        <div className="contentInner">
          <div className="card">
            <div className="cardTitle">Create account</div>
            <div className="cardSub" style={{ marginTop: 8 }}>
              Secure onboarding. A 6-digit verification code will be emailed to you.
            </div>
          </div>

          {err ? (
            <div className="flashError" style={{ marginTop: 12 }}>
              {err}
            </div>
          ) : null}

          <form
            onSubmit={submit}
            className="card"
            style={{ marginTop: 12, display: "grid", gap: 10 }}
          >
            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>
                Full name
              </div>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>
                Email
              </div>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="cardSub" style={{ marginBottom: 6 }}>
                Password
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <div className="cardSub" style={{ marginTop: 6 }}>
                Minimum 8 characters.
              </div>
            </div>

            <button className="btnPrimary" disabled={!can || busy} type="submit">
              {busy ? "Creating…" : "Create account"}
            </button>

            <div className="cardSub">
              Already have an account?{" "}
              <a href="/signin" style={{ color: "rgba(56,189,248,.95)" }}>
                Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

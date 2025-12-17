"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, ensureUserBootstrap } from "../../../lib/api";


const ADMIN_EMAIL = "elonmuskite@gmail.com";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => email.trim() && password, [email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    setErr("");
    setBusy(true);

    try {
      await signIn(email.trim(), password);

      // Gate: must be the admin email
      const boot = await ensureUserBootstrap();
      const signedInEmail = String(boot?.user?.email || "").toLowerCase();

      if (signedInEmail !== ADMIN_EMAIL.toLowerCase()) {
        setErr("Not authorized for admin access.");
        // optional: sign out immediately if you want
        // await signOut();
        return;
      }

      router.replace("/admin/users");
    } catch (e2) {
      setErr(e2?.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-auth">
      <div className="dt-auth-card">
        <div className="dt-auth-title">Admin access</div>
        <div className="dt-auth-sub">
          Sign in with the authorized admin email to continue.
        </div>

        {err ? <div className="dt-flash dt-flash-err">{err}</div> : null}

        <form onSubmit={submit} className="dt-form">
          <label className="dt-label">
            Email
            <input
              className="dt-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="dt-label">
            Password
            <input
              className="dt-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button className="dt-btn dt-btn-primary" disabled={!can || busy} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

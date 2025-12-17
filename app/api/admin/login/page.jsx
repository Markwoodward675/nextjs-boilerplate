"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "../../lib/api"; // your lib/api should export `account` (Appwrite Account instance)

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const can = useMemo(() => email.trim() && password, [email, password]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");

    try {
      // Appwrite login
      await account.createEmailPasswordSession(email.trim(), password);

      // Get JWT for server verification
      const jwt = await account.createJWT();
      const token = jwt?.jwt;
      if (!token) throw new Error("Unable to create admin JWT.");

      // Store JWT client-side (for admin API calls)
      localStorage.setItem("dt_admin_jwt", token);

      // Establish httpOnly cookie session on server
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "x-admin-jwt": token },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Admin session denied.");

      router.replace("/admin");
    } catch (e2) {
      setErr(e2?.message || "Unable to sign in as admin.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-auth">
      <div className="dt-auth-card">
        <div className="dt-auth-title">Admin Access</div>
        <div className="dt-auth-sub">Sign in with your Appwrite admin user.</div>

        {err ? <div className="dt-flash dt-flash-err">{err}</div> : null}

        <form onSubmit={submit} className="dt-auth-form">
          <label className="dt-label">Email</label>
          <input className="dt-input" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="dt-label">Password</label>
          <input className="dt-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button className="dt-btn dt-btn-primary" disabled={!can || busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

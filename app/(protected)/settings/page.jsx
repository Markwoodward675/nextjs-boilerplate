"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import { getCurrentUser, getUserProfile } from "../../../lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;
        setMe(u);

        const p = await getUserProfile(u.$id);
        if (!cancel) setProfile(p);
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load profile.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [router]);

  const metrics = [
    { label: "User", value: profile?.username || "—", sub: "username" },
    { label: "Role", value: profile?.role || "user", sub: "access" },
    { label: "KYC", value: profile?.kycStatus || "not_submitted", sub: "status" },
    { label: "Verification", value: String(profile?.verificationCodeVerified ?? false), sub: "code gate" },
  ];

  if (loading) return <div className="text-sm text-slate-400">Loading settings…</div>;
  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Account Controls</h1>
          <p className="text-sm text-slate-400">Identity, risk, and configuration.</p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {err}
          </div>
        ) : null}

        <MetricStrip items={metrics} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-semibold text-slate-200">Profile Snapshot</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field k="Full Name" v={profile?.fullName || me?.name || "—"} />
            <Field k="Email" v={profile?.email || me?.email || "—"} />
            <Field k="Display Name" v={profile?.displayName || "—"} />
            <Field k="Website" v={profile?.websiteUrl || "—"} />
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

function Field({ k, v }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="mt-1 text-sm text-slate-100 break-all">{v}</div>
    </div>
  );
}

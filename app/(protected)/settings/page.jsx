"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import AvatarModal from "../../../components/AvatarModal";
import AppShellPro from "../../../components/AppShellPro";
import {
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
} from "../../../lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;
        setMe(u);

        const p = await getUserProfile(u.$id);
        if (!cancel) {
          setProfile(p);
          setFullName(p?.fullName || u?.name || "");
          setDisplayName(p?.displayName || "");
        }
      } catch (e) {
        if (!cancel) setErr(e?.message || "Unable to load settings.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [router]);

  const metrics = useMemo(() => {
    return [
      { label: "User", value: profile?.username || "—", sub: "Username" },
      { label: "Role", value: profile?.role || "user", sub: "Access" },
      { label: "KYC", value: profile?.kycStatus || "not_submitted", sub: "Status" },
      { label: "Verified", value: String(profile?.verificationCodeVerified ?? false), sub: "Code" },
    ];
  }, [profile]);

  const saveProfile = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      if (!me?.$id) throw new Error("No session");
      const updated = await updateUserProfile(me.$id, {
        fullName: fullName.trim(),
        displayName: displayName.trim(),
      });
      setProfile(updated);
      setOk("Saved.");
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onPickImage = async (file) => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      if (!file) return;
      if (!me?.$id) throw new Error("No session");

      // upload + update profile.profileImage (stored value handled by lib/api)
      const updated = await uploadProfilePicture(me.$id, file);
      setProfile(updated);
      setOk("Profile picture updated.");
    } catch (e) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!me) return null;

  return (
    <AppShellPro rightSlot={<AvatarModal profile={profile} />}>
      <UnverifiedEmailGate>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
            <p className="text-sm text-slate-400">Account profile and controls.</p>
          </div>

          {err ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {err}
            </div>
          ) : null}
          {ok ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {ok}
            </div>
          ) : null}

          <MetricStrip items={metrics} />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-sm font-semibold text-slate-200">Profile</div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Full name</div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500">Display name</div>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-widest text-slate-500">
                Profile picture
              </div>
              <label className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60 transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0] || null)}
                />
                Select image
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveProfile}
                className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </UnverifiedEmailGate>
    </AppShellPro>
  );
}

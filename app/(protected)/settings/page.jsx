"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UnverifiedEmailGate from "../../../components/UnverifiedEmailGate";
import MetricStrip from "../../../components/MetricStrip";
import {
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  uploadKycDocument,
} from "../../../lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [address, setAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) return router.replace("/signin");
        if (cancel) return;
        setMe(u);

        const p = await getUserProfile(u.$id);
        if (cancel) return;

        setProfile(p);
        setFullName(p?.fullName || u?.name || "");
        setDisplayName(p?.displayName || "");
        setAddress(p?.address || "");
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
      { label: "Username", value: profile?.username || "—", sub: "Account" },
      { label: "Email", value: profile?.email || me?.email || "—", sub: "Login" },
      { label: "KYC", value: profile?.kycStatus || "not_submitted", sub: "Status" },
      { label: "Country", value: profile?.country || "—", sub: "Locked" },
    ];
  }, [profile, me]);

  const save = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      if (!me?.$id) throw new Error("No session");
      const updated = await updateUserProfile(me.$id, {
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        address: address.trim(),
      });
      setProfile(updated);
      setOk("Saved.");
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPickProfilePic = async (file) => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      if (!file) return;
      const updated = await uploadProfilePicture(me.$id, file);
      setProfile(updated);
      setOk("Profile picture updated.");
    } catch (e) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onPickKycDoc = async (file) => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      if (!file) return;
      const updated = await uploadKycDocument(me.$id, file);
      setProfile(updated);
      setOk("KYC document submitted.");
    } catch (e) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <UnverifiedEmailGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
          <p className="text-sm text-slate-400">Profile and verification.</p>
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

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-slate-500">Address</div>
              <input
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-amber-500/40"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-widest text-slate-500">Country</div>
              <input
                disabled
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-sm text-slate-400 outline-none"
                value={profile?.country || ""}
                placeholder="Country"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-sm font-semibold text-slate-200">Profile Picture</div>
            <div className="mt-3 text-sm text-slate-400">
              Upload a new profile image.
            </div>

            <label className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60 transition cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickProfilePic(e.target.files?.[0] || null)}
              />
              Select image
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="text-sm font-semibold text-slate-200">KYC</div>
            <div className="mt-3 text-sm text-slate-400">
              Upload your identification document.
            </div>

            <label className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60 transition cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => onPickKycDoc(e.target.files?.[0] || null)}
              />
              Upload document
            </label>

            <div className="mt-3 text-xs text-slate-500">
              Current: {profile?.kycStatus || "not_submitted"}
              {profile?.kycDocFileName ? ` • ${profile.kycDocFileName}` : ""}
            </div>
          </div>
        </div>
      </div>
    </UnverifiedEmailGate>
  );
}

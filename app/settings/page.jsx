"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser } from "../../lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [unverified, setUnverified] = useState(false);
  const [user, setUser] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");

  const [kycStatus, setKycStatus] = useState("not_submitted");
  const [saving, setSaving] = useState(false);

  // Email verification gate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;

      if (!u) {
        router.replace("/auth/login?next=/settings");
        return;
      }

      if (!u.emailVerification) {
        setUser(u);
        setUnverified(true);
        setChecking(false);
        return;
      }

      setUser(u);
      setChecking(false);

      // Load basic settings from localStorage for now
      if (typeof window !== "undefined") {
        const profile = window.localStorage.getItem("dt_profile");
        if (profile) {
          try {
            const parsed = JSON.parse(profile);
            setDisplayName(parsed.displayName || u.name || "");
            setPhone(parsed.phone || "");
            setAddress(parsed.address || "");
            setCountry(parsed.country || "");
            setKycStatus(parsed.kycStatus || "not_submitted");
          } catch {
            setDisplayName(u.name || "");
          }
        } else {
          setDisplayName(u.name || "");
        }

        const storedAvatar = window.localStorage.getItem("dt_avatar");
        if (storedAvatar) {
          setAvatarFileName("Uploaded");
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dt_avatar", reader.result);
        setAvatarFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = () => {
    if (!user) return;
    setSaving(true);
    try {
      if (typeof window !== "undefined") {
        const profile = {
          displayName,
          phone,
          address,
          country,
          kycStatus,
        };
        window.localStorage.setItem("dt_profile", JSON.stringify(profile));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitKyc = () => {
    setKycStatus("pending");
    if (typeof window !== "undefined") {
      const profile = window.localStorage.getItem("dt_profile");
      let parsed = {};
      if (profile) {
        try {
          parsed = JSON.parse(profile);
        } catch {
          parsed = {};
        }
      }
      const updated = { ...parsed, kycStatus: "pending" };
      window.localStorage.setItem("dt_profile", JSON.stringify(updated));
    }
  };

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  if (unverified) {
    return (
      <main className="px-4 pt-6 pb-24">
        <Card>
          <h1 className="text-xs font-semibold text-slate-100">
            Verify your email to manage settings
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Once your email is verified, you&apos;ll be able to customize your
            Day Trader profile and KYC information.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-4">
      <section>
        <div className="text-[11px] text-slate-400 mb-1">
          Account settings
        </div>
        <p className="text-[11px] text-slate-300">
          Update your profile details, avatar, and KYC information. Your email
          remains the primary login identifier.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-[3fr,2fr]">
        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            Profile & contact
          </div>
          <div className="space-y-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-0.5">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                Email (login)
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                Country (detected at signup)
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 outline-none"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Country is fixed to what was detected when your account was
                created. Admin can update this in special cases.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 mb-0.5">
                Profile picture
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="w-full text-[10px] text-slate-400"
              />
              {avatarFileName && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {avatarFileName}
                </p>
              )}
              <p className="mt-1 text-[10px] text-slate-500">
                Image is stored locally in your browser for now and previewed on
                wallet cards. You can later connect this to Appwrite Storage for
                persistent avatars.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="mt-2 w-full rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-[11px] text-slate-950 font-semibold px-3 py-2 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-[11px] text-slate-400 mb-2">
            KYC verification
          </div>
          <p className="text-[11px] text-slate-300">
            Upload identity documents so admin can review and approve your KYC
            profile. This may be required for higher limits and payouts.
          </p>

          <div className="mt-2 text-[11px] space-y-2">
            <div>
              <span className="text-slate-400">Current status: </span>
              <span className="font-semibold capitalize">
                {kycStatus.replace("_", " ")}
              </span>
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                ID front image
              </label>
              <input type="file" accept="image/*" className="w-full text-[10px] text-slate-400" />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                ID back image
              </label>
              <input type="file" accept="image/*" className="w-full text-[10px] text-slate-400" />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5">
                Selfie with ID
              </label>
              <input type="file" accept="image/*" className="w-full text-[10px] text-slate-400" />
            </div>

            <button
              type="button"
              onClick={handleSubmitKyc}
              className="mt-2 w-full rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-100 font-semibold px-3 py-2"
            >
              Submit KYC for review
            </button>
            <p className="mt-1 text-[10px] text-slate-500">
              Admins will review your documents and set your KYC status to
              approved or rejected. This interface simply reflects that status.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}

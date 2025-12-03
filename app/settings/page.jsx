// app/settings/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Card";
import { getCurrentUser, COLLECTIONS } from "../../lib/api";
import { databases, DB_ID } from "../../lib/appwrite";

export default function SettingsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // editable fields
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [kycStatus, setKycStatus] = useState("not_submitted");

  // avatar
  const [avatarSrc, setAvatarSrc] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("dt_avatar");
      if (stored) setAvatarSrc(stored);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await getCurrentUser();
      if (!mounted) return;
      if (!u) {
        router.replace("/auth/login?next=/settings");
        return;
      }
      setUser(u);

      try {
        if (!DB_ID) throw new Error("Database not configured.");
        const res = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.userProfiles,
          [/* by userId */]
        );
        // Filter manually since we didn't pass query to keep compatibility
        const doc =
          res.documents.find((d) => d.userId === u.$id) || null;
        setProfile(doc);

        setDisplayName(doc?.displayName || u.name || "");
        setPhone(doc?.phone || "");
        setContactEmail(doc?.email || u.email || "");
        setAddress(doc?.address || "");
        setCountry(doc?.country || "");
        setKycStatus(doc?.kycStatus || "not_submitted");
      } catch (err) {
        console.error(err);
        setError(String(err.message || err));
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!profile || !DB_ID) return;
    setSaving(true);
    setError("");

    try {
      await databases.updateDocument(
        DB_ID,
        COLLECTIONS.userProfiles,
        profile.$id,
        {
          displayName,
          phone,
          email: contactEmail,
          address,
          // country intentionally NOT changed here – admin only
        }
      );
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatarSrc(dataUrl);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dt_avatar", dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  if (checking) {
    return (
      <main className="px-4 pt-6 pb-24 text-xs text-slate-400">
        Checking session…
      </main>
    );
  }

  return (
    <main className="px-4 pt-4 pb-24 space-y-3">
      <Card>
        <h1 className="text-xs font-semibold text-slate-100">
          Account settings
        </h1>
        <p className="mt-1 text-[11px] text-slate-400">
          Manage your Day Trader profile, avatar, KYC information, and
          affiliate configuration.
        </p>
        {error && (
          <p className="mt-2 text-[10px] text-red-400">
            Unable to load settings: {error}
          </p>
        )}
      </Card>

      {/* Profile & avatar */}
      <section className="grid gap-3 md:grid-cols-[2fr,3fr]">
        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            Profile & avatar
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Upload a profile picture. It appears as a round avatar on wallet
            cards and can be expanded in a modal.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-16 w-16 rounded-full border border-slate-600 bg-slate-900 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-100">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                (user?.name || "Trader")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()
              )}
            </div>
            <label className="text-[11px] text-slate-300 cursor-pointer">
              <span className="rounded-full bg-slate-800 px-3 py-1.5 inline-block hover:bg-slate-700">
                Upload profile image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Image is stored locally in your browser for now and previewed in
            wallet cards. You can later connect this to Appwrite Storage for
            persistent avatars.
          </p>
        </Card>

        <Card>
          <form onSubmit={handleSaveProfile} className="space-y-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Email (contact)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Login email remains managed by Appwrite. Contact admin if you
                need to change sign-in credentials.
              </p>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Country (locked)
              </label>
              <input
                type="text"
                value={country || "Detected at signup (admin locked)"}
                disabled
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Country is detected at account creation (IP-based) and can
                only be changed by admin.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-3 w-full rounded-full bg-blue-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </Card>
      </section>

      {/* KYC block */}
      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="text-xs font-semibold text-slate-100">
            KYC verification
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Submit identity documents and a selfie for manual review. Status
            will show as pending, approved, or rejected once processed by
            admin.
          </p>
          <p className="mt-2 text-[11px] text-slate-300">
            Current status:{" "}
            <span className="font-semibold capitalize">
              {kycStatus.replace("_", " ")}
            </span>
          </p>
        </Card>
        <Card>
          <div className="grid gap-2 text-[11px]">
            <div>
              <label className="block text-slate-400 mb-1">
                ID front
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-[11px] text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                ID back
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-[11px] text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Selfie with ID
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-[11px] text-slate-300"
              />
            </div>
            <button
              type="button"
              className="mt-2 w-full rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-emerald-500"
            >
              Submit KYC for review
            </button>
            <p className="mt-1 text-[10px] text-slate-500">
              Admins will update your status in the profile table. This
              interface only surfaces that status to you.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}

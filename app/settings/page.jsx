"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import {
  getCurrentUser,
  COLLECTIONS
} from "../../lib/api";
import {
  databases,
  DB_ID,
  QueryHelper,
  IDHelper
} from "../../lib/appwrite";

export default function SettingsPage() {
  const [state, setState] = useState({
    loading: true,
    error: "",
    user: null,
    affiliate: null,
    profile: null
  });

  const [profilePreview, setProfilePreview] = useState(null);
  const [kycFront, setKycFront] = useState(null);
  const [kycBack, setKycBack] = useState(null);
  const [kycSelfie, setKycSelfie] = useState(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMessage, setKycMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!DB_ID) {
          if (mounted) {
            setState({
              loading: false,
              error: "Appwrite database is not configured.",
              user: null,
              affiliate: null,
              profile: null
            });
          }
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setState({
              loading: false,
              error: "You need to be logged in.",
              user: null,
              affiliate: null,
              profile: null
            });
          }
          return;
        }

        // Load affiliate doc
        const affRes = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.affiliateAccounts,
          [QueryHelper.equal("userId", user.$id)]
        );
        const affiliate = affRes.total > 0 ? affRes.documents[0] : null;

        // Load user profile doc from user_profile
        const profRes = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.userProfiles,
          [QueryHelper.equal("userId", user.$id)]
        );
        let profile = profRes.total > 0 ? profRes.documents[0] : null;

        // Ensure profile exists
        if (!profile) {
          profile = await databases.createDocument(
            DB_ID,
            COLLECTIONS.userProfiles,
            IDHelper.unique(),
            {
              userId: user.$id,
              displayName: user.name || user.email,
              role: "user",
              kycStatus: "not_submitted"
            }
          );
        }

        // Load avatar preview from localStorage
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem("daytrader_avatar");
          if (stored) {
            setProfilePreview(stored);
          }
        }

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            affiliate,
            profile
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load settings.",
            user: null,
            affiliate: null,
            profile: null
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, affiliate, profile } = state;

  async function handleCreateAffiliate() {
    if (!user || !DB_ID) return;
    try {
      const code =
        "DAY" +
        user.$id
          .slice(0, 6)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");

      const doc = await databases.createDocument(
        DB_ID,
        COLLECTIONS.affiliateAccounts,
        IDHelper.unique(),
        {
          userId: user.$id,
          code,
          status: "pending",
          tier: "standard",
          lifetimeCommission: 0,
          totalDeposits: 0,
          totalSignups: 0
        }
      );

      setState((prev) => ({ ...prev, affiliate: doc, error: "" }));
    } catch (err) {
      console.error(err);
      setState((prev) => ({
        ...prev,
        error: err?.message || "Could not create affiliate account."
      }));
    }
  }

  function handleProfileFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setProfilePreview(base64);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("daytrader_avatar", String(base64));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleKycFront(e) {
    const file = e.target.files?.[0];
    setKycFront(file || null);
  }
  function handleKycBack(e) {
    const file = e.target.files?.[0];
    setKycBack(file || null);
  }
  function handleKycSelfie(e) {
    const file = e.target.files?.[0];
    setKycSelfie(file || null);
  }

  async function handleSubmitKyc() {
    setKycMessage("");
    if (!profile || !DB_ID) {
      setKycMessage("No profile found to attach KYC to.");
      return;
    }
    if (!kycFront || !kycBack || !kycSelfie) {
      setKycMessage(
        "Please select front, back, and selfie images before submitting."
      );
      return;
    }

    setKycSubmitting(true);
    try {
      // Here you would upload files to Appwrite Storage and store file IDs.
      // For now, we only mark status as pending on the profile.
      const updated = await databases.updateDocument(
        DB_ID,
        COLLECTIONS.userProfiles,
        profile.$id,
        {
          kycStatus: "pending"
        }
      );

      setState((prev) => ({
        ...prev,
        profile: updated
      }));

      setKycMessage(
        "KYC submitted. Status is now pending and will be updated by admin to approved or rejected."
      );
    } catch (err) {
      console.error(err);
      setKycMessage("Unable to submit KYC at this time.");
    } finally {
      setKycSubmitting(false);
    }
  }

  const kycStatus = profile?.kycStatus || "not_submitted";

  return (
    <main className="space-y-4 pb-10">
      {loading && (
        <p className="text-xs text-slate-400">Loading settings…</p>
      )}
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Card>
        <h1 className="text-sm font-semibold text-slate-100">
          Account settings
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your Day Trader profile, avatar, KYC information, and affiliate
          configuration.
        </p>
      </Card>

      {/* Profile & avatar + KYC */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Avatar */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Profile & avatar
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Upload a profile picture. It will appear as a round avatar on your
            wallet cards and can be expanded in a modal.
          </p>

          <div className="mt-3 flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center text-xs text-slate-400">
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>No photo</span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-2">
              <div>
                <span className="block text-[11px] text-slate-500">
                  Upload profile image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileFileChange}
                  className="mt-1 block text-[11px] text-slate-200"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Image is stored locally in your browser for now and previewed in
                wallet cards. You can later connect this to Appwrite Storage for
                persistent avatars.
              </p>
            </div>
          </div>
        </Card>

        {/* KYC */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            KYC verification
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Submit identity documents and a selfie for manual review. Status
            will show as pending, approved, or rejected once processed by
            admin.
          </p>

          <p className="mt-2 text-[11px] text-slate-300">
            Current status:{" "}
            <span
              className={
                kycStatus === "approved"
                  ? "text-emerald-400"
                  : kycStatus === "rejected"
                  ? "text-red-400"
                  : "text-amber-300"
              }
            >
              {kycStatus.replace("_", " ")}
            </span>
          </p>

          <div className="mt-3 space-y-3 text-xs text-slate-300">
            <div>
              <span className="block text-[11px] text-slate-500 mb-1">
                ID front
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleKycFront}
                className="block text-[11px] text-slate-200"
              />
              {kycFront && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {kycFront.name}
                </p>
              )}
            </div>

            <div>
              <span className="block text-[11px] text-slate-500 mb-1">
                ID back
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleKycBack}
                className="block text-[11px] text-slate-200"
              />
              {kycBack && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {kycBack.name}
                </p>
              )}
            </div>

            <div>
              <span className="block text-[11px] text-slate-500 mb-1">
                Selfie with ID
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleKycSelfie}
                className="block text-[11px] text-slate-200"
              />
              {kycSelfie && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {kycSelfie.name}
                </p>
              )}
            </div>

            {kycMessage && (
              <p className="mt-1 text-[11px] text-emerald-400">
                {kycMessage}
              </p>
            )}

            <button
              onClick={handleSubmitKyc}
              disabled={kycSubmitting}
              className="mt-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {kycSubmitting ? "Submitting…" : "Submit KYC for review"}
            </button>

            <p className="text-[10px] text-slate-500 mt-2">
              Admins will update your status to approved or rejected in the
              profile table. This interface surfaces that status to you.
            </p>
          </div>
        </Card>
      </section>

      {/* Affiliate center (same as before, grouped) */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-100">
          Affiliate center
        </h2>
        {!user && (
          <p className="mt-1 text-xs text-slate-400">
            Log in to manage affiliate settings.
          </p>
        )}
        {user && !affiliate && (
          <div className="mt-2 space-y-2 text-xs text-slate-400">
            <p>
              You don&apos;t have an affiliate account yet. Create one to
              generate a referral code and earn commissions when traders sign up
              via your links.
            </p>
            <button
              onClick={handleCreateAffiliate}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              Create affiliate account
            </button>
          </div>
        )}
        {user && affiliate && (
          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <p>
              Status:{" "}
              <span className="font-semibold">{affiliate.status}</span>
            </p>
            <p>
              Code:{" "}
              <span className="font-mono text-emerald-400">
                {affiliate.code}
              </span>
            </p>
            <p>
              Tier: <span className="font-semibold">{affiliate.tier}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Share links like{" "}
              <span className="font-mono">
                /auth/register?ref={affiliate.code}
              </span>{" "}
              or embed your code in marketing pages. Commission events will
              appear in the Affiliate and Transactions sections.
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}

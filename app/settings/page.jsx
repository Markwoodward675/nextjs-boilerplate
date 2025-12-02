"use client";

import { useEffect, useState } from "react";
import Card from "../../components/Card";
import { getCurrentUser, COLLECTIONS } from "../../lib/api";
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
    affiliate: null
  });

  // Local-only preview state for profile picture & KYC files
  const [profilePreview, setProfilePreview] = useState(null);
  const [kycIdFile, setKycIdFile] = useState(null);
  const [kycProofFile, setKycProofFile] = useState(null);

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
              affiliate: null
            });
          }
          return;
        }

        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setState({
              loading: false,
              error: "You need to be logged in to manage settings.",
              user: null,
              affiliate: null
            });
          }
          return;
        }

        const affList = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.affiliateAccounts,
          [QueryHelper.equal("userId", user.$id)]
        );

        const affiliate = affList.total > 0 ? affList.documents[0] : null;

        if (mounted) {
          setState({
            loading: false,
            error: "",
            user,
            affiliate
          });
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setState({
            loading: false,
            error: "Unable to load settings.",
            user: null,
            affiliate: null
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const { loading, error, user, affiliate } = state;

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
    setProfilePreview(URL.createObjectURL(file));
    // TODO: wire to Appwrite Storage bucket for real upload
  }

  function handleKycIdChange(e) {
    const file = e.target.files?.[0];
    setKycIdFile(file || null);
    // TODO: wire to Appwrite Storage
  }

  function handleKycProofChange(e) {
    const file = e.target.files?.[0];
    setKycProofFile(file || null);
    // TODO: wire to Appwrite Storage
  }

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
          Manage your Day Trader profile, avatar, KYC uploads, and affiliate
          program access.
        </p>
      </Card>

      {/* Profile & avatar */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            Profile & avatar
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Upload a profile picture for your dashboard and account.
          </p>

          <div className="mt-3 flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border border-slate-700 bg-slate-900 overflow-hidden flex items-center justify-center text-xs text-slate-400">
                {profilePreview ? (
                  // Round preview modal style avatar
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
                Recommended: square image, at least 256×256. This preview is
                local only – connect Appwrite Storage to persist images.
              </p>
            </div>
          </div>
        </Card>

        {/* KYC upload */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-100">
            KYC verification
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Upload identity documents and proof of address as part of your KYC
            process.
          </p>

          <div className="mt-3 space-y-3 text-xs text-slate-300">
            <div>
              <span className="block text-[11px] text-slate-500 mb-1">
                Government ID (passport, national ID, or driver&apos;s license)
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleKycIdChange}
                className="block text-[11px] text-slate-200"
              />
              {kycIdFile && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {kycIdFile.name}
                </p>
              )}
            </div>

            <div>
              <span className="block text-[11px] text-slate-500 mb-1">
                Proof of address (utility bill, bank statement)
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleKycProofChange}
                className="block text-[11px] text-slate-200"
              />
              {kycProofFile && (
                <p className="mt-1 text-[10px] text-slate-500">
                  Selected: {kycProofFile.name}
                </p>
              )}
            </div>

            <p className="text-[10px] text-slate-500">
              This interface is ready for integration with Appwrite Storage and
              a KYC review workflow. For now, files are only selected and not
              uploaded.
            </p>
          </div>
        </Card>
      </section>

      {/* Affiliate center (unchanged logic, just grouped) */}
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
              or store the code in your marketing pages. Deposits and
              transactions from referred users can generate commission entries
              in your Appwrite collections.
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}

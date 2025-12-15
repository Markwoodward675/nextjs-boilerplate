"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureUserBootstrap,
  updateUserProfile,
  uploadProfilePicture,
  uploadKycDocument,
} from "../../../lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [boot, setBoot] = useState(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const b = await ensureUserBootstrap();
        if (!b.profile.verificationCodeVerified) return router.replace("/verify-code");
        if (!cancel) {
          setBoot(b);
          setDisplayName(b.profile.displayName || b.profile.fullName || "");
          setAddress(b.profile.address || "");
        }
      } catch {
        router.replace("/signin");
      }
    })();
    return () => (cancel = true);
  }, [router]);

  const save = async () => {
    if (!boot) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await updateUserProfile(boot.user.$id, {
        displayName,
        address,
      });
      setOk("Settings saved.");
    } catch (e) {
      setErr(e?.message || "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  };

  const onProfilePic = async (file) => {
    if (!boot || !file) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await uploadProfilePicture(boot.user.$id, file);
      const b2 = await ensureUserBootstrap();
      setBoot(b2);
      setOk("Profile picture updated.");
    } catch (e) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const onKyc = async (file) => {
    if (!boot || !file) return;
    setBusy(true);
    setErr("");
    setOk("");
    try {
      await uploadKycDocument(boot.user.$id, file);
      const b2 = await ensureUserBootstrap();
      setBoot(b2);
      setOk("KYC submitted. Awaiting review.");
    } catch (e) {
      setErr(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!boot) return <div className="cardSub">Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <div className="cardTitle">Settings</div>
        <p className="cardSub">Profile, verification, and documents.</p>
      </div>

      {err ? <div className="flashError">{err}</div> : null}
      {ok ? <div className="flashOk">{ok}</div> : null}

      <div className="card">
        <div className="cardTitle">Profile</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div>
            <div className="cardSub" style={{ marginBottom: 6 }}>Display name</div>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div>
            <div className="cardSub" style={{ marginBottom: 6 }}>Email</div>
            <input className="input" value={boot.profile.email || ""} disabled />
          </div>

          <div>
            <div className="cardSub" style={{ marginBottom: 6 }}>Country (locked)</div>
            <input className="input" value={boot.profile.country || ""} disabled />
          </div>

          <div>
            <div className="cardSub" style={{ marginBottom: 6 }}>Address</div>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <button className="btnPrimary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="cardTitle">Profile picture</div>
        <p className="cardSub">Upload from your device.</p>
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(e) => onProfilePic(e.target.files?.[0])}
          disabled={busy}
          style={{ marginTop: 10 }}
        />
        {boot.profile.profileImageUrl ? (
          <div style={{ marginTop: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={boot.profile.profileImageUrl} alt="Profile" style={{ width: 120, borderRadius: 14, border: "1px solid rgba(51,65,85,.75)" }} />
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="cardTitle">KYC documents</div>
        <p className="cardSub">
          Status: <b>{boot.profile.kycStatus || "not_submitted"}</b>
        </p>

        <input
          className="input"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => onKyc(e.target.files?.[0])}
          disabled={busy}
          style={{ marginTop: 10 }}
        />

        {boot.profile.kycDocUrl ? (
          <div className="cardSub" style={{ marginTop: 10 }}>
            Document uploaded.
          </div>
        ) : null}
      </div>
    </div>
  );
}

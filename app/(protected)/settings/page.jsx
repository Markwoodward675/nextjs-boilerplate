"use client";

import { useEffect, useMemo, useState } from "react";
import { db, DB_ID, COL, errMsg, requireSession } from "../../../lib/appwriteClient";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // user_profile doc
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");

  const [profilePic, setProfilePic] = useState(null);
  const [kycFront, setKycFront] = useState(null);
  const [kycBack, setKycBack] = useState(null);
  const [kycSelfie, setKycSelfie] = useState(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const u = await requireSession();
        if (dead) return;
        setUser(u);

        const p = await db.getDocument(DB_ID, COL.USER_PROFILE, u.$id).catch(() => null);
        if (!dead) {
          setProfile(p);
          setFullName(p?.fullName || u.name || "");
          setCountry(p?.country || "");
          setAddress(p?.address || "");
        }
      } catch (e) {
        if (!dead) setErr(errMsg(e, "Unable to load settings."));
      }
    })();
    return () => (dead = true);
  }, []);

  const canSave = useMemo(() => !!fullName.trim(), [fullName]);

  const saveProfile = async () => {
    if (!user?.$id) return;
    setBusy(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/settings/profile-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.$id,
          fullName: fullName.trim(),
          country: country.trim(),
          address: address.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Unable to save profile.");
      setMsg("Profile saved.");
    } catch (e) {
      setErr(errMsg(e, "Unable to save profile."));
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async () => {
    if (!user?.$id || !profilePic) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("userId", user.$id);
      fd.append("file", profilePic);

      const res = await fetch("/api/settings/upload-profile-picture", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Upload failed.");
      setMsg("Profile picture uploaded.");
    } catch (e) {
      setErr(errMsg(e, "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const submitKyc = async () => {
    if (!user?.$id || !kycFront || !kycBack || !kycSelfie) {
      setErr("Upload front, back, and selfie images.");
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("userId", user.$id);
      fd.append("front", kycFront);
      fd.append("back", kycBack);
      fd.append("selfie", kycSelfie);

      const res = await fetch("/api/settings/kyc-submit", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error || "KYC submit failed.");
      setMsg("KYC submitted. Awaiting review.");
    } catch (e) {
      setErr(errMsg(e, "KYC submit failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dt-shell" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="dt-card dt-glow">
        <div className="dt-h2">Settings</div>
        <div className="dt-subtle">Update profile, upload a profile picture, and submit KYC.</div>
      </div>

      {err ? <div className="dt-flash dt-flash-err" style={{ marginTop: 12 }}>{err}</div> : null}
      {msg ? <div className="dt-flash dt-flash-ok" style={{ marginTop: 12 }}>{msg}</div> : null}

      <div className="dt-grid" style={{ marginTop: 14 }}>
        <div className="dt-card">
          <div className="dt-h3">Profile</div>

          <div className="dt-form" style={{ marginTop: 10 }}>
            <label className="dt-label">Full name</label>
            <input className="dt-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />

            <label className="dt-label">Country</label>
            <input className="dt-input" value={country} onChange={(e) => setCountry(e.target.value)} />

            <label className="dt-label">Address</label>
            <input className="dt-input" value={address} onChange={(e) => setAddress(e.target.value)} />

            <button className="dt-btn dt-btn-primary" disabled={!canSave || busy} onClick={saveProfile}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>

        <div className="dt-card">
          <div className="dt-h3">Profile picture</div>
          <div className="dt-subtle">Upload from your device (mobile/desktop).</div>

          <div className="dt-form" style={{ marginTop: 10 }}>
            <input className="dt-file" type="file" accept="image/*" onChange={(e) => setProfilePic(e.target.files?.[0] || null)} />
            <button className="dt-btn" disabled={!profilePic || busy} onClick={uploadAvatar}>
              {busy ? "Uploading…" : "Upload picture"}
            </button>
          </div>
        </div>
      </div>

      <div className="dt-card" style={{ marginTop: 14 }}>
        <div className="dt-h3">KYC verification</div>
        <div className="dt-subtle">Upload ID front, ID back, and a selfie.</div>

        <div className="dt-grid" style={{ marginTop: 10 }}>
          <div className="dt-card dt-card-inner">
            <div className="dt-k">Front</div>
            <input className="dt-file" type="file" accept="image/*" onChange={(e) => setKycFront(e.target.files?.[0] || null)} />
          </div>
          <div className="dt-card dt-card-inner">
            <div className="dt-k">Back</div>
            <input className="dt-file" type="file" accept="image/*" onChange={(e) => setKycBack(e.target.files?.[0] || null)} />
          </div>
          <div className="dt-card dt-card-inner">
            <div className="dt-k">Selfie</div>
            <input className="dt-file" type="file" accept="image/*" onChange={(e) => setKycSelfie(e.target.files?.[0] || null)} />
          </div>
        </div>

        <button className="dt-btn dt-btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={submitKyc}>
          {busy ? "Submitting…" : "Submit KYC"}
        </button>
      </div>
    </div>
  );
}

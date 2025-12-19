// lib/api.js
"use client";

import { account } from "./appwrite";
import { errMsg as _errMsg } from "./appwriteClient";

/**
 * Single source of truth: user_profile collection.
 * Verify flow uses:
 * - POST /api/auth/send-verify-code
 * - POST /api/auth/verify-code
 */

export function getErrorMessage(e, fallback = "Something went wrong.") {
  return _errMsg(e, fallback);
}

// ---------- AUTH (client) ----------
export async function signOut() {
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }
}

// alias used by components/SignOutButton.jsx
export async function logoutUser() {
  return signOut();
}

export async function signIn(email, password) {
  const e = String(email || "").trim();
  const p = String(password || "");
  if (!e || !p) throw new Error('Missing required parameter: "email" or "password".');

  // HARD FIX: if a session exists, Appwrite can throw:
  // "Creation of a session is prohibited when a session is active."
  // So we always try deleteSessions first (safe/no-op if none).
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }

  // Compat call
  if (typeof account?.createEmailPasswordSession === "function") {
    await account.createEmailPasswordSession(e, p);
    return;
  }
  if (typeof account?.createEmailSession === "function") {
    await account.createEmailSession(e, p);
    return;
  }

  throw new Error("a.createEmailPasswordSession is not a function (upgrade appwrite SDK).");
}

export async function signUp({ fullName, email, password }) {
  const name = String(fullName || "").trim();
  const e = String(email || "").trim();
  const p = String(password || "");

  if (!name) throw new Error("Full name is required.");
  if (!e) throw new Error("Email is required.");
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  const { ID } = await import("appwrite");
  if (!account?.create) throw new Error("Appwrite account client not ready.");

  // Create account
  await account.create(ID.unique(), e, p, name);

  // Create session immediately
  await signIn(e, p);
}

// ---------- BOOTSTRAP ----------
export async function ensureUserBootstrap() {
  // Bootstrap = user + user_profile
  // Uses ONLY user_profile as source of truth.
  const me = await account.get().catch(() => null);
  if (!me?.$id) return { user: null, profile: null };

  // Get profile via server (admin) to avoid permission / CORS / rules issues.
  const res = await fetch("/api/bootstrap", { method: "POST" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Unable to load profile.");
  }

  return data;
}

// ---------- VERIFY CODE FLOW ----------
export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  const uid = String(userId || "").trim();
  const c = String(code || "").trim();

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}

// ---------- ACCOUNT STATUS (optional helper used in signup UX) ----------
export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  const res = await fetch("/api/auth/account-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: e }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return data;
}

// ---------- PASSWORD RECOVERY (exports to satisfy your pages) ----------
export async function requestPasswordRecovery(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email is required.");

  const res = await fetch("/api/auth/request-password-reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: e }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send recovery email.");
  return data;
}

export async function completePasswordRecovery({ userId, secret, password }) {
  const uid = String(userId || "").trim();
  const s = String(secret || "").trim();
  const p = String(password || "");

  if (!uid || !s || !p) throw new Error("Missing recovery parameters.");

  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, secret: s, password: p }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to reset password.");
  return data;
}

// Alias used by ./app/reset-password/reset-password-client.jsx
export async function resetPasswordWithRecovery(payload) {
  return completePasswordRecovery(payload);
}

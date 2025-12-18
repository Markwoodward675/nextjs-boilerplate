// lib/api.js
"use client";

import {
  account,
  db,
  ID,
  Query,
  DB_ID,
  COL,
  isConfigured,
  errMsg,
} from "./appwriteClient";

import { createEmailSessionCompat as _createEmailSessionCompat } from "./appwrite";

function needConfigured() {
  if (!isConfigured()) throw new Error("Appwrite is not configured. Missing ENDPOINT/PROJECT_ID.");
}

function needDb() {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

/** Friendly error text */
export function getErrorMessage(e, fallback = "Something went wrong.") {
  return errMsg(e, fallback);
}

/**
 * Session helper:
 * - if a session is already active, delete it and create the new one
 *   (you explicitly asked for this behavior)
 */
async function createSession(email, password) {
  needConfigured();

  try {
    return await _createEmailSessionCompat(account, email, password);
  } catch (e) {
    const m = errMsg(e, "");
    if (/session is active|prohibited when a session is active/i.test(m)) {
      try {
        await account.deleteSessions();
      } catch {
        // ignore
      }
      return await _createEmailSessionCompat(account, email, password);
    }
    throw e;
  }
}

/**
 * Ensure we always have:
 * - user (from account.get)
 * - profile (from user_profile docId=user.$id)
 */
export async function ensureUserBootstrap() {
  needConfigured();
  let user = null;

  try {
    user = await account.get();
  } catch {
    return { user: null, profile: null };
  }

  if (!user?.$id) return { user: null, profile: null };

  // profile is optional if DB not configured yet
  if (!DB_ID) return { user, profile: null };

  try {
    const profile = await db.getDocument(DB_ID, COL.USER_PROFILE, user.$id);
    return { user, profile };
  } catch {
    return { user, profile: null };
  }
}

/** Sign out safely */
export async function signOut() {
  needConfigured();
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}
export const logoutUser = signOut;

/** Sign in */
export async function signIn(email, password) {
  needConfigured();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error('Missing required parameter: "password"');

  await createSession(e, p);
  return await ensureUserBootstrap();
}

/**
 * Sign up:
 * - create account
 * - create session
 * - upsert user_profile (single source of truth)
 *
 * IMPORTANT:
 * - DO NOT write unknown fields (you saw "Unknown attribute" errors before)
 */
export async function signUp({ fullName, email, password, referralId = "" }) {
  needConfigured();
  needDb();

  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Missing full name.");
  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create user (ID.unique lets Appwrite generate safely)
  try {
    await account.create(ID.unique(), e, p, name);
  } catch (err) {
    // If user exists -> bubble up so UI can redirect accordingly
    throw err;
  }

  // Create session
  await createSession(e, p);

  const boot = await ensureUserBootstrap();
  const userId = boot?.user?.$id;
  if (!userId) throw new Error("Account created but session not established.");

  const now = new Date().toISOString();

  // Upsert user_profile docId = userId (single source of truth)
  const payload = {
    userId,
    email: e,
    fullName: name,
    kycStatus: "not_submitted",
    verificationCodeVerified: false,
    createdAt: now,
    updatedAt: now,
  };

  // Optional: store referrerAffiliateId only if your schema includes it
  // (it DOES exist in your user_profile columns)
  if (referralId) {
    const asInt = Number(referralId);
    if (Number.isFinite(asInt)) payload.referrerAffiliateId = asInt;
  }

  try {
    await db.getDocument(DB_ID, COL.USER_PROFILE, userId);
    await db.updateDocument(DB_ID, COL.USER_PROFILE, userId, payload);
  } catch {
    await db.createDocument(DB_ID, COL.USER_PROFILE, userId, payload);
  }

  return boot;
}

/**
 * Verify code flow (via Next API routes)
 */
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
  return true;
}

export async function verifySixDigitCode(userId, code) {
  const uid = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!uid) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");
  return true;
}

/**
 * Password recovery (Appwrite requires a VALID absolute URL)
 * Your Cloud plan not showing "Redirect URLs" is fine — this feature uses a URL param.
 */
function resolveAppUrl() {
  const envUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

export async function requestPasswordRecovery(email) {
  needConfigured();
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  const base = resolveAppUrl();
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL (needed for recovery link).");

  const redirect = `${base}/reset-password`;
  // Validate URL strictly (fixes: Invalid `url` param: Invalid URI.)
  // eslint-disable-next-line no-new
  new URL(redirect);

  await account.createRecovery(e, redirect);
  return true;
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  needConfigured();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1) throw new Error("Missing new password.");
  if (p1.length < 8) throw new Error("Password must be at least 8 characters.");
  if (p1 !== p2) throw new Error("Passwords do not match.");

  await account.updateRecovery(uid, sec, p1, p2);
  return true;
}

// Backwards aliases used by some pages
export const resetPasswordWithRecovery = completePasswordRecovery;

/**
 * Optional helper used by your signup page in earlier versions.
 * (Appwrite client cannot reliably check verification by email without admin rights.)
 * We return "unknown" so your UI can route to signin/verify gracefully.
 */
export async function getAccountStatusByEmail() {
  return { verified: false, exists: true, unknown: true };
}

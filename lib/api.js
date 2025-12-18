"use client";

import { ID, Query, requireClient, DB_ID, COL } from "./appwriteClient";

/* --------------------------------- helpers --------------------------------- */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

function nowISO() {
  return new Date().toISOString();
}

function safeOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin || "";
}

function appUrlBase() {
  const envUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const base = envUrl || safeOrigin();

  // must be absolute http(s)
  try {
    const u = new URL(base);
    if (!/^https?:$/.test(u.protocol)) return "";
    return u.origin;
  } catch {
    return "";
  }
}

function recoveryRedirectUrl() {
  const base = appUrlBase();
  return base ? `${base}/reset-password` : "";
}

/**
 * Strip fields that Appwrite schema rejects.
 * (Fixes “Invalid document structure: Unknown attribute …” permanently.)
 */
async function schemaSafeCreateOrUpdate({ db, databaseId, collectionId, docId, data, create = false }) {
  const payload = { ...data };

  // retry loop: if schema rejects a field, remove it and retry
  for (let i = 0; i < 6; i++) {
    try {
      if (create) {
        return await db.createDocument(databaseId, collectionId, docId, payload);
      }
      return await db.updateDocument(databaseId, collectionId, docId, payload);
    } catch (e) {
      const msg = getErrorMessage(e, "");
      const m = msg.match(/Unknown attribute:\s*"([^"]+)"/i);
      if (!m?.[1]) throw e;

      const bad = m[1];
      if (bad in payload) delete payload[bad];
      else throw e;
    }
  }

  // final attempt
  if (create) return await db.createDocument(databaseId, collectionId, docId, payload);
  return await db.updateDocument(databaseId, collectionId, docId, payload);
}

/* ------------------------------- Auth (SDK) -------------------------------- */

export async function signOut() {
  const { account } = requireClient();
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
  return true;
}

/**
 * HARD FIX: If a session exists, delete it first, then create the new one.
 * Fixes: “Creation of a session is prohibited when a session is active.”
 */
export async function signIn(email, password) {
  const { account } = requireClient();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // clear any existing session (safe)
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }

  // session compat
  if (typeof account.createEmailPasswordSession === "function") {
    await account.createEmailPasswordSession(e, p);
    return true;
  }
  if (typeof account.createEmailSession === "function") {
    await account.createEmailSession(e, p);
    return true;
  }

  throw new Error(
    "Appwrite SDK session method not found. Ensure you are using the `appwrite` package in the browser."
  );
}

export async function getCurrentUser() {
  const { account } = requireClient();
  return await account.get().catch(() => null);
}

/**
 * signUp:
 * - creates Appwrite user
 * - signs in immediately
 * - creates minimal user_profile if DB configured (otherwise skips)
 */
export async function signUp({ fullName, email, password }) {
  const { account } = requireClient(); // DB not required for auth
  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Full name is required.");
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // create user
  const user = await account.create(ID.unique(), e, p, name);

  // create session (so verify page works)
  await signIn(e, p);

  // attempt bootstrap (won’t crash if DB missing)
  await ensureUserBootstrap().catch(() => null);

  return user;
}

/* -------------------------- Bootstrap (user + profile) ---------------------- */

export async function ensureUserBootstrap() {
  const user = await getCurrentUser();
  if (!user?.$id) return { user: null, profile: null };

  // If DB not configured, return just user
  if (!DB_ID) return { user, profile: null };

  const { db } = requireClient({ requireDb: true });

  const col = COL.USER_PROFILE;
  const uid = user.$id;

  // Try get profile doc (docId == userId)
  try {
    const profile = await db.getDocument(DB_ID, col, uid);
    return { user, profile };
  } catch {
    // create minimal profile (schema-safe)
    const profileData = {
      userId: uid,
      email: user?.email || "",
      fullName: user?.name || "",
      verificationCodeVerified: false,
      kycStatus: "not_submitted",
      role: "user",
    };

    const profile = await schemaSafeCreateOrUpdate({
      db,
      databaseId: DB_ID,
      collectionId: col,
      docId: uid,
      data: profileData,
      create: true,
    });

    return { user, profile };
  }
}

/* -------------------------- Verify code (API routes) ------------------------ */

export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Unable to send verification code.");
  return true;
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id, code: c }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Invalid or expired code.");

  // refresh bootstrap after verification
  await ensureUserBootstrap().catch(() => null);
  return true;
}

/* -------------------------- Password recovery (SDK) ------------------------- */

export async function requestPasswordRecovery(email) {
  const { account } = requireClient();
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const redirectUrl = recoveryRedirectUrl();
  if (!redirectUrl) {
    throw new Error("Invalid `url` param: Invalid URI. Set NEXT_PUBLIC_APP_URL to https://your-domain.com");
  }

  return await account.createRecovery(e, redirectUrl);
}

export async function resetPasswordWithRecovery(userId, secret, password, passwordAgain) {
  const { account } = requireClient();
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1) throw new Error('Missing required parameter: "password"');
  if (p2 && p1 !== p2) throw new Error("Passwords do not match.");

  return await account.updateRecovery(uid, sec, p1, p2 || p1);
}

// Back-compat names some pages might still import
export const completePasswordRecovery = async ({ userId, secret, password, passwordAgain }) =>
  resetPasswordWithRecovery(userId, secret, password, passwordAgain);

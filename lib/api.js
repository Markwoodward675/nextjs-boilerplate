// lib/api.js
"use client";

import {
  account,
  db,
  storage,
  ID,
  Query,
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
  ENUM,
  errMsg,
} from "./appwriteClient";

import { createEmailSessionCompat, safeSignOut, isAppwriteConfigured } from "./appwrite";

// Re-export for pages that import these from lib/api
export { db, storage, ID, Query, ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ENUM, isAppwriteConfigured };

export function getErrorMessage(e, fallback) {
  return errMsg(e, fallback);
}

function mustHaveProject() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error("Appwrite is not configured. Missing endpoint/project.");
  }
}

export async function ensureUserBootstrap() {
  const r = await fetch("/api/bootstrap", { method: "GET", cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.ok) {
    return { ok: false, user: null, profile: null, error: data?.error || "Not signed in." };
  }
  return data;
}

/** SIGN UP */
export async function signUp({ fullName, email, password }) {
  mustHaveProject();

  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error('Missing "fullName".');
  if (!e) throw new Error('Missing "email".');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  try {
    // Create user
    await account.create(ID.unique(), e, p, name);

    // Create session immediately
    await createEmailSessionCompat(e, p);

    return await ensureUserBootstrap();
  } catch (ex) {
    throw new Error(errMsg(ex, "Unable to create account."));
  }
}

/** SIGN IN */
export async function signIn(email, password) {
  mustHaveProject();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e || !p) throw new Error("Missing email or password.");

  // compat handles “session active” + SDK differences
  await createEmailSessionCompat(e, p);

  return await ensureUserBootstrap();
}

/** SIGN OUT */
export async function signOut() {
  await safeSignOut();
}

/** VERIFY CODE */
export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const r = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.ok) throw new Error(data?.error || "Unable to send code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  const uid = String(userId || "").trim();
  const c = String(code || "").trim();

  if (!uid) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const r = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, code: c }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data?.ok) throw new Error(data?.error || "Verify failed.");

  return data;
}

/** PASSWORD RECOVERY */
export async function requestPasswordRecovery(email) {
  mustHaveProject();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  // Must be absolute URL
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!origin || !/^https?:\/\//i.test(origin)) {
    throw new Error("Recovery URL is not configured. Set NEXT_PUBLIC_APP_URL to https://your-domain.com");
  }

  const url = new URL("/reset-password", origin).toString();

  try {
    return await account.createRecovery(e, url);
  } catch (ex) {
    throw new Error(errMsg(ex, "Unable to send recovery email."));
  }
}

// alias used by your forgot-password page
export const sendRecoveryEmail = requestPasswordRecovery;

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  mustHaveProject();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (p1.length < 8) throw new Error("Password must be at least 8 characters.");
  if (p1 !== p2) throw new Error("Passwords do not match.");

  try {
    return await account.updateRecovery(uid, sec, p1, p2);
  } catch (ex) {
    throw new Error(errMsg(ex, "Unable to update password."));
  }
}

/**
 * Legacy: some older pages call this.
 * We keep it to prevent build/import crashes.
 */
export async function getAccountStatusByEmail() {
  return { verified: false };
}

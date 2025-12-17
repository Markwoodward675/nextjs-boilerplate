"use client";

import {
  account,
  databases,
  storage,
  ID,
  Query,
  isAppwriteConfigured,
  createEmailSessionCompat,
} from "./appwrite";

/* =========================================================
   Small helpers
========================================================= */

function env(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

function ensureConfigured({ requireDb = false } = {}) {
  if (!isAppwriteConfigured) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  if (requireDb && !DB_ID) {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

/* =========================================================
   IDs (only DB/collection IDs live here)
========================================================= */

export const DB_ID =
  env("NEXT_PUBLIC_APPWRITE_DATABASE_ID") ||
  env("NEXT_PUBLIC_APPWRITE_DB_ID") ||
  "";

export const BUCKET_ID = env("NEXT_PUBLIC_APPWRITE_BUCKET_ID") || "uploads";

export const COL = {
  USER_PROFILE: env("APPWRITE_USERS_COLLECTION_ID") || "user_profile",
  WALLETS: env("NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID") || "wallets",
  TX: env("NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID") || "transactions",
  ALERTS: env("NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID") || "alerts",
  VERIFY_CODES: env("APPWRITE_VERIFY_CODES_COLLECTION_ID") || "verify_codes",
};

export const db = databases;

/* =========================================================
   Auth
========================================================= */

async function deleteCurrentSessionCompat() {
  try {
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return;
    }
  } catch {}
  try {
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
    }
  } catch {}
}

async function replaceSessionThenCreate(email, password) {
  try {
    return await createEmailSessionCompat(email, password);
  } catch (e) {
    const msg = getErrorMessage(e, "");
    if (/session is active|prohibited when a session is active/i.test(msg)) {
      await deleteCurrentSessionCompat();
      return await createEmailSessionCompat(email, password);
    }
    throw e;
  }
}

export async function logoutUser() {
  // used by SignOutButton.jsx
  try {
    await deleteCurrentSessionCompat();
  } catch {}
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  return true;
}

export async function signIn(email, password) {
  ensureConfigured();

  const e = String(email || "").trim();
  const p = String(password || "");

  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error("Missing password.");

  try {
    await replaceSessionThenCreate(e, p);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to sign in."));
  }

  return { ok: true, next: "/verify-code" };
}

export async function signUp({ fullName, email, password, referralId = "" }) {
  ensureConfigured({ requireDb: true });

  const name = String(fullName || "").trim();
  const e = String(email || "").trim();
  const p = String(password || "");

  if (!name) throw new Error("Missing full name.");
  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error("Missing password.");

  // Create account
  try {
    await account.create(ID.unique(), e, p, name);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create account."));
  }

  // Create session
  try {
    await replaceSessionThenCreate(e, p);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create session."));
  }

  // Optional: store referral later (don’t block signup)
  void referralId;

  return { ok: true, next: "/verify-code" };
}

/* =========================================================
   Useful exports (if other pages use them)
========================================================= */

export { account, storage, ID, Query };

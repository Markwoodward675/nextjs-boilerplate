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

/* -----------------------------
   ENV helpers
------------------------------ */
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
  if (requireDb && !DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

/* -----------------------------
   IDs
------------------------------ */
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

/* -----------------------------
   Session helpers
------------------------------ */
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

/* =========================================================
   AUTH exports (expected by app)
========================================================= */

// Some pages import signOut (not logoutUser). Export both.
export async function signOut() {
  ensureConfigured();
  await deleteCurrentSessionCompat();
  return true;
}

export async function logoutUser() {
  // Used by SignOutButton.jsx
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

  await replaceSessionThenCreate(e, p);

  // Keep return shape stable for pages
  return { ok: true, next: "/verify-code" };
}

export async function signUp(input) {
  // supports signUp({ fullName, email, password, referralId })
  ensureConfigured({ requireDb: true });

  const fullName = String(input?.fullName || "").trim();
  const email = String(input?.email || "").trim();
  const password = String(input?.password || "");
  const referralId = String(input?.referralId || "").trim();

  if (!fullName) throw new Error("Missing full name.");
  if (!email) throw new Error("Missing email.");
  if (!password) throw new Error("Missing password.");

  await account.create(ID.unique(), email, password, fullName);

  await replaceSessionThenCreate(email, password);

  // Optional: store referral in profile later (don’t block)
  void referralId;

  return { ok: true, next: "/verify-code" };
}

/* =========================================================
   BOOTSTRAP exports (expected by app)
========================================================= */

function uuid36() {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function createDefaultUserProfile(user) {
  const now = new Date().toISOString();

  // IMPORTANT: only fields you already have in your schema
  const doc = {
    userId: user.$id,
    email: user.email || "",
    fullName: user.name || null,
    verificationCodeVerified: false,
    kycStatus: null,
    country: null,
    address: null,
    role: null,
    createdAt: now,
    updatedAt: now,
  };

  return await db.createDocument(DB_ID, COL.USER_PROFILE, user.$id, doc);
}

async function ensureWalletsForUser(userId) {
  try {
    const list = await db.listDocuments(DB_ID, COL.WALLETS, [
      Query.equal("userId", userId),
      Query.limit(50),
    ]);
    if (list?.total > 0) return list.documents || [];

    const now = new Date().toISOString();
    const mk = (label) => ({
      walletId: uuid36(),
      userId,
      currencyType: "USD",
      balance: 0,
      isActive: true,
      createdDate: now,
      updatedDate: now,
      type: label,
    });

    const created = [];
    created.push(await db.createDocument(DB_ID, COL.WALLETS, ID.unique(), mk("main")));
    created.push(await db.createDocument(DB_ID, COL.WALLETS, ID.unique(), mk("trading")));
    created.push(await db.createDocument(DB_ID, COL.WALLETS, ID.unique(), mk("affiliate")));
    return created;
  } catch {
    return [];
  }
}

export async function ensureUserBootstrap() {
  ensureConfigured({ requireDb: true });

  const user = await account.get().catch(() => null);
  if (!user?.$id) throw new Error("Not signed in.");

  let profile = null;
  try {
    profile = await db.getDocument(DB_ID, COL.USER_PROFILE, user.$id);
  } catch {
    profile = await createDefaultUserProfile(user);
  }

  // Touch updatedAt only
  try {
    await db.updateDocument(DB_ID, COL.USER_PROFILE, user.$id, {
      updatedAt: new Date().toISOString(),
    });
  } catch {}

  const wallets = await ensureWalletsForUser(user.$id);

  return { user, profile, wallets };
}

/* =========================================================
   VERIFY CODE exports (expected by app)
========================================================= */

export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");

  // mark verified in profile (only safe field)
  try {
    await db.updateDocument(DB_ID, COL.USER_PROFILE, id, {
      verificationCodeVerified: true,
      updatedAt: new Date().toISOString(),
    });
  } catch {}

  return data;
}

/* =========================================================
   PASSWORD RECOVERY exports (expected by app)
========================================================= */

function absUrl(pathname) {
  const base =
    (env("NEXT_PUBLIC_APP_URL") && env("NEXT_PUBLIC_APP_URL").startsWith("http")
      ? env("NEXT_PUBLIC_APP_URL")
      : "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!base || !base.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL for recovery links.");
  }
  const p = String(pathname || "/").startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${p}`;
}

export async function requestPasswordRecovery(email) {
  ensureConfigured();
  const e = String(email || "").trim();
  if (!e) throw new Error("Missing email.");

  if (typeof account.createRecovery !== "function") {
    throw new Error("Appwrite SDK missing createRecovery().");
  }

  // Your reset page is /reset-password
  const redirectUrl = absUrl("/reset-password");
  return await account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  ensureConfigured();
  if (!userId || !secret || !password || !passwordAgain) {
    throw new Error("Missing recovery parameters.");
  }
  if (typeof account.updateRecovery !== "function") {
    throw new Error("Appwrite SDK missing updateRecovery().");
  }
  return await account.updateRecovery(userId, secret, password, passwordAgain);
}

/* =========================================================
   Convenience re-exports
========================================================= */
export { account, databases, storage, ID, Query };

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
   IDs (MATCH YOUR REAL DB)
------------------------------ */
export const DB_ID =
  env("NEXT_PUBLIC_APPWRITE_DATABASE_ID") ||
  env("NEXT_PUBLIC_APPWRITE_DB_ID") ||
  "";

export const BUCKET_ID = env("NEXT_PUBLIC_APPWRITE_BUCKET_ID") || "uploads";

// ✅ MATCH YOUR COLLECTIONS
export const COL = {
  PROFILES: env("APPWRITE_PROFILES_COLLECTION_ID") || "profiles",
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

export async function signOut() {
  ensureConfigured();
  await deleteCurrentSessionCompat();
  return true;
}

export async function logoutUser() {
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

  return { ok: true, next: "/verify-code" };
}

export async function signUp(input) {
  ensureConfigured({ requireDb: true });

  const fullName = String(input?.fullName || "").trim();
  const email = String(input?.email || "").trim();
  const password = String(input?.password || "");
  const referralId = String(input?.referralId || "").trim();
  void referralId;

  if (!fullName) throw new Error("Missing full name.");
  if (!email) throw new Error("Missing email.");
  if (!password) throw new Error("Missing password.");

  await account.create(ID.unique(), email, password, fullName);
  await replaceSessionThenCreate(email, password);

  // Create profile + wallets after signup
  await ensureUserBootstrap();

  return { ok: true, next: "/verify-code" };
}

/* =========================================================
   BOOTSTRAP (profiles + wallets) ✅
========================================================= */

function uuid36() {
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Profiles schema you shared:
// userId (required string), email (required string), fullName, country, kycStatus,
// verificationCodeVerified (required boolean), createdAt (string), verifiedAt (datetime nullable)
async function getOrCreateProfile(user) {
  const nowIso = new Date().toISOString();

  // 1) Try doc id == user.$id (recommended)
  try {
    const doc = await db.getDocument(DB_ID, COL.PROFILES, user.$id);
    return doc;
  } catch {}

  // 2) Try query by userId (supports old data where docId is random)
  try {
    const list = await db.listDocuments(DB_ID, COL.PROFILES, [
      Query.equal("userId", user.$id),
      Query.limit(1),
    ]);
    const found = list?.documents?.[0];
    if (found) return found;
  } catch {}

  // 3) Create with doc id == user.$id
  const payload = {
    userId: user.$id,
    email: user.email || "",
    fullName: user.name || null,
    country: null,
    kycStatus: null,
    verificationCodeVerified: false,
    createdAt: nowIso,
    verifiedAt: null, // datetime nullable
  };

  return await db.createDocument(DB_ID, COL.PROFILES, user.$id, payload);
}

async function ensureWalletsForUser(userId) {
  try {
    const list = await db.listDocuments(DB_ID, COL.WALLETS, [
      Query.equal("userId", userId),
      Query.limit(50),
    ]);
    if (list?.total > 0) return list.documents || [];
  } catch {}

  const nowIso = new Date().toISOString();

  // Must match wallets schema:
  // walletId (36), userId, currencyType(enum), balance(double>=0), isActive(bool), createdDate(datetime), updatedDate(optional)
  const mk = (label) => ({
    walletId: uuid36(),
    userId,
    currencyType: "USD", // must exist in your enum values
    balance: 0,
    isActive: true,
    createdDate: nowIso,
    updatedDate: null,
    type: label, // harmless if your schema allows extra fields; if it errors, remove this line
  });

  const created = [];
  created.push(await db.createDocument(DB_ID, COL.WALLETS, ID.unique(), mk("main")));
  created.push(await db.createDocument(DB_ID, COL.WALLETS, ID.unique(), mk("trading")));
  created.push(await db.createDocument(DB_ID, COL.WALLETS, ID.unique(), mk("affiliate")));
  return created;
}

export async function ensureUserBootstrap() {
  ensureConfigured({ requireDb: true });

  const user = await account.get().catch(() => null);
  if (!user?.$id) throw new Error("Not signed in.");

  const profile = await getOrCreateProfile(user);

  // touch update timestamp using Appwrite system fields (no custom needed)
  // Do NOT write unknown fields.

  const wallets = await ensureWalletsForUser(user.$id);

  return { user, profile, wallets };
}

/* =========================================================
   VERIFY CODE (uses your API routes)
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

  // ✅ update profile in "profiles" (verifiedAt exists in your schema)
  try {
    // profile doc id == userId (we created it that way)
    await db.updateDocument(DB_ID, COL.PROFILES, id, {
      verificationCodeVerified: true,
      verifiedAt: new Date().toISOString(),
    });
  } catch {}

  return data;
}

/* =========================================================
   PASSWORD RECOVERY (if your pages import them)
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

  const redirectUrl = absUrl("/reset-password");
  if (typeof account.createRecovery !== "function") {
    throw new Error("Appwrite SDK missing createRecovery().");
  }
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

"use client";

import {
  account,
  db,
  ID,
  Query,
  DB_ID,
  COL,
  errMsg,
  isConfigured,
} from "./appwriteClient";

/* -------------------------------------------
   Core helpers
-------------------------------------------- */

export function isAppwriteConfigured() {
  return isConfigured() && Boolean(DB_ID);
}

export function getErrorMessage(e, fallback = "Something went wrong.") {
  const msg = errMsg(e, fallback);

  if (/cors|access-control-allow-origin|blocked by cors/i.test(msg)) {
    return (
      "CORS blocked the request. In Appwrite Console → Project → Platforms, add your Vercel domain(s) " +
      "including your *.vercel.app preview and your custom domain, then redeploy."
    );
  }

  if (/db_id|database.*not configured/i.test(msg)) {
    return "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID in Vercel env.";
  }

  return msg;
}

function requireConfigured() {
  if (!isAppwriteConfigured()) {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

/* -------------------------------------------
   Session + auth (canonical)
-------------------------------------------- */

export async function getCurrentUser() {
  requireConfigured();
  return await account.get();
}

export async function signOut() {
  try {
    return await account.deleteSessions();
  } catch {
    return null;
  }
}

/**
 * Requirement:
 * - signIn should work even if a session is already active.
 * So we clear sessions first.
 */
export async function signIn(email, password) {
  requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }

  return await createEmailSessionCompat(e, p);
}

export async function signUp({ fullName, email, password }) {
  requireConfigured();

  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  return await account.create(ID.unique(), e, p, name || "");
}

/**
 * Appwrite Web SDK compat:
 * - some versions expose createEmailPasswordSession
 * - some expose createEmailSession
 */
export async function createEmailSessionCompat(email, password) {
  if (typeof account?.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account?.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }

  throw new Error(
    "Appwrite Web SDK mismatch: account.createEmailPasswordSession/createEmailSession not found. " +
      "Ensure client uses the 'appwrite' package (not node-appwrite)."
  );
}

/* -------------------------------------------
   Bootstrap (canonical)
-------------------------------------------- */

export async function ensureUserBootstrap() {
  const r = await fetch("/api/bootstrap", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Bootstrap failed.");
  return data;
}

/* -------------------------------------------
   Verification code flow
-------------------------------------------- */

export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const r = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Unable to send verification code.");
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
  if (!r.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}

/* -------------------------------------------
   Password recovery (canonical)
-------------------------------------------- */

function getOriginSafe() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export async function requestPasswordRecovery(email) {
  requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const origin = getOriginSafe();
  if (!origin) {
    throw new Error("Recovery link cannot be generated (missing window.origin). Try again in the browser.");
  }

  const redirectUrl = `${origin}/reset-password`;
  return await account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery(userId, secret, password) {
  requireConfigured();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pass = String(password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (pass.length < 8) throw new Error("Password must be at least 8 characters.");

  return await account.updateRecovery(uid, sec, pass, pass);
}

/* -------------------------------------------
   Data helpers (safe defaults)
-------------------------------------------- */

async function safeList(col, queries = [], fallback = []) {
  try {
    requireConfigured();
    const res = await db.listDocuments(DB_ID, col, queries);
    return res?.documents || fallback;
  } catch {
    return fallback;
  }
}

async function safeGet(col, id) {
  try {
    requireConfigured();
    return await db.getDocument(DB_ID, col, id);
  } catch {
    return null;
  }
}

export async function getUserProfile(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  return await safeGet(COL.USER_PROFILE, uid);
}

export async function getUserWallets(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];
  return await safeList(COL.WALLETS, [Query.equal("userId", uid), Query.limit(100)]);
}

export async function getUserTransactions(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];
  return await safeList(COL.TRANSACTIONS, [Query.equal("userId", uid), Query.limit(200)]);
}

export async function getUserAlerts(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];
  return await safeList(COL.ALERTS, [Query.equal("userId", uid), Query.limit(200)]);
}

export async function getAffiliateAccount(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  const docs = await safeList(COL.AFFILIATE_ACCOUNTS, [Query.equal("userId", uid), Query.limit(1)]);
  return docs?.[0] || null;
}

export async function getAffiliateOverview(userId) {
  const accountDoc = await getAffiliateAccount(userId);
  return {
    account: accountDoc,
    commissions: await safeList(COL.AFFILIATE_COMMISSIONS, [
      Query.equal("userId", String(userId || "")),
      Query.limit(200),
    ]),
  };
}

/* -------------------------------------------
   Backwards-compatible aliases (for old imports)
-------------------------------------------- */

export const loginWithEmailPassword = signIn;
export const registerUser = signUp;
export const logoutUser = signOut;

export const resendVerificationEmail = createOrRefreshVerifyCode;

// forgot-password expects this name:
export const sendRecoveryEmail = requestPasswordRecovery;

// optional legacy stub:
export async function getAccountStatusByEmail() {
  return null;
}

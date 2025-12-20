"use client";

import {
  account,
  db,
  ID,
  Query,
  DB_ID,
  COL,
  errMsg,
  isConfigured
} from "./appwriteClient";

/* -------------------------------------------
   Core helpers
-------------------------------------------- */

export function isAppwriteConfigured() {
  return isConfigured() && Boolean(DB_ID);
}

export function getErrorMessage(e, fallback = "Something went wrong.") {
  const msg = errMsg(e, fallback);

  // Friendlier hint for the CORS/Platform issue (common in your logs)
  if (/cors|access-control-allow-origin|blocked by cors/i.test(msg)) {
    return (
      "CORS blocked the request. In Appwrite Console → Project → Platforms, add your Vercel domain(s) " +
      "including your *.vercel.app preview and your custom domain, then redeploy."
    );
  }

  // DB missing
  if (/db_id|database.*not configured/i.test(msg)) {
    return (
      "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID in Vercel env."
    );
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
  // deleting sessions when none exist is okay; ignore errors
  try {
    return await account.deleteSessions();
  } catch {
    return null;
  }
}

/**
 * HARD REQUIREMENT:
 * signIn should create a session even if one is already active.
 * We do that by deleting sessions first.
 */
export async function signIn(email, password) {
  requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error("Missing required parameter: \"email\"");
  if (!p) throw new Error("Missing required parameter: \"password\"");

  // Appwrite throws: "Creation of a session is prohibited when a session is active."
  // So we force clear existing sessions first.
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

  if (!e) throw new Error("Missing required parameter: \"email\"");
  if (!p) throw new Error("Missing required parameter: \"password\"");
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create Appwrite auth user
  return await account.create(ID.unique(), e, p, name || "");
}

/**
 * Appwrite SDK compat:
 * some versions use createEmailPasswordSession, some createEmailSession
 */
export async function createEmailSessionCompat(email, password) {
  const fn =
    account?.createEmailPasswordSession ||
    account?.createEmailSession;

  if (typeof fn !== "function") {
    throw new Error(
      "Your Appwrite Web SDK is incompatible: account.createEmailPasswordSession is missing. " +
        "Ensure you are importing from the 'appwrite' package (not node-appwrite) on the client."
    );
  }

  // IMPORTANT: call it as a method, not extracted (avoids 'bind' issues)
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  return await account.createEmailSession(email, password);
}

/* -------------------------------------------
   Bootstrap (canonical)
-------------------------------------------- */

export async function ensureUserBootstrap() {
  // server route must read cookie and return { user, profile }
  const r = await fetch("/api/bootstrap", {
    method: "GET",
    credentials: "include",
    cache: "no-store"
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
    body: JSON.stringify({ userId: uid })
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
    body: JSON.stringify({ userId: uid, code: c })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}

/* -------------------------------------------
   Password recovery (canonical)
-------------------------------------------- */

function getOriginSafe() {
  // works client-side
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

export async function requestPasswordRecovery(email) {
  requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing required parameter: \"email\"");

  // Appwrite requires an absolute URL (your error was Invalid URI)
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

  // Appwrite expects password + passwordAgain
  return await account.updateRecovery(uid, sec, pass, pass);
}

/* -------------------------------------------
   Data helpers (safe defaults so pages don't crash)
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
  // If you have a real aggregation, implement later.
  // For now, keep build + runtime stable.
  const accountDoc = await getAffiliateAccount(userId);
  return {
    account: accountDoc,
    commissions: await safeList(COL.AFFILIATE_COMMISSIONS, [Query.equal("userId", String(userId || "")), Query.limit(200)])
  };
}

/* -------------------------------------------
   Backwards-compatible aliases (CRITICAL)
   These names are what your repo currently imports.
-------------------------------------------- */

// login/register/logout naming used in older components/pages:
export const loginWithEmailPassword = signIn;
export const registerUser = signUp;
export const logoutUser = signOut;

// verification naming in some components:
export const resendVerificationEmail = createOrRefreshVerifyCode;

// forgot-password page naming:
export const sendRecoveryEmail = requestPasswordRecovery;

// some builds referenced these names:
export { requestPasswordRecovery };

// optional / legacy no-op (keeps builds from failing if referenced)
export async function getAccountStatusByEmail() {
  // You mentioned this earlier but no server route exists.
  // Keep as a safe stub.
  return null;
}

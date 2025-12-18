"use client";

import { account, db, DB_ID, COL, ID, Query, errMsg } from "./appwriteClient";

function pickUrl() {
  const v = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (v && /^https?:\/\//i.test(v)) return v.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function isNotFound(e) {
  return String(e?.code) === "404" || /not\s*found/i.test(errMsg(e, ""));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function getErrorMessage(e, fallback = "Something went wrong.") {
  return errMsg(e, fallback);
}

// --- Appwrite SDK compatibility wrappers ---
async function createEmailPasswordSession(email, password) {
  // Prefer modern method
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  // Older SDK fallback (some versions expose createEmailSession)
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }
  throw new Error("Appwrite SDK mismatch: email session method not found.");
}

async function safeDeleteSessions() {
  try {
    if (typeof account.deleteSessions === "function") await account.deleteSessions();
  } catch {
    // ignore (not signed in)
  }
}

// --- Core session/user bootstrap ---
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function ensureUserBootstrap() {
  const user = await getCurrentUser();
  if (!user?.$id) return { user: null, profile: null };

  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  const col = COL.user_profile;

  // Single source of truth: user_profile docId == userId
  try {
    const profile = await db.getDocument(DB_ID, col, user.$id);
    return { user, profile };
  } catch (e) {
    // Create minimal profile if missing
    if (!isNotFound(e)) throw e;

    const now = new Date().toISOString();
    const payload = {
      userId: user.$id,
      email: user.email || "",
      fullName: user.name || "",
      verificationCodeVerified: false,
      kycStatus: "not_submitted",
      createdAt: now,
      updatedAt: now,
    };

    const profile = await db.createDocument(DB_ID, col, user.$id, payload);
    return { user, profile };
  }
}

// --- Auth ---
export async function signUp({ fullName, email, password }) {
  const e = normalizeEmail(email);
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create user
  await account.create(ID.unique(), e, p, String(fullName || "").trim());

  // Immediately sign in (some UIs expect session)
  await safeDeleteSessions();
  await createEmailPasswordSession(e, p);

  // Ensure profile exists
  await ensureUserBootstrap();

  return true;
}

export async function signIn(email, password) {
  const e = normalizeEmail(email);
  const p = String(password || "");
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // Hardfix: if a session is active, delete it then create new
  await safeDeleteSessions();
  await createEmailPasswordSession(e, p);

  return true;
}

export async function signOut() {
  await safeDeleteSessions();
  return true;
}

// --- Data helpers used all over the app (keep names stable) ---
export async function getUserProfile(userId) {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  return await db.getDocument(DB_ID, COL.user_profile, userId);
}

export async function getUserWallets(userId) {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  const r = await db.listDocuments(DB_ID, COL.wallets, [Query.equal("userId", userId)]);
  return r?.documents || [];
}

export async function getUserTransactions(userId, limit = 50) {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  const r = await db.listDocuments(DB_ID, COL.transactions, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.max(1, Math.min(100, Number(limit) || 50))),
  ]);
  return r?.documents || [];
}

export async function getUserAlerts(userId, limit = 50) {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  const r = await db.listDocuments(DB_ID, COL.alerts, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.max(1, Math.min(100, Number(limit) || 50))),
  ]);
  return r?.documents || [];
}

export async function getAffiliateAccount(userId) {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  const r = await db.listDocuments(DB_ID, COL.affiliate, [Query.equal("userId", userId), Query.limit(1)]);
  return r?.documents?.[0] || null;
}

export async function getAffiliateOverview(userId) {
  const acct = await getAffiliateAccount(userId);
  return {
    account: acct,
    totalReferrals: Number(acct?.totalReferrals || 0),
    totalCommission: Number(acct?.totalCommission || 0),
  };
}

// --- Verify-code (email via server routes) ---
export async function createOrRefreshVerifyCode(userId) {
  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid code.");
  return data;
}

export async function resendVerificationEmail(userId) {
  return await createOrRefreshVerifyCode(userId);
}

// --- Password recovery ---
export async function sendRecoveryEmail(email) {
  const e = normalizeEmail(email);
  const url = pickUrl();
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is missing or invalid.");
  // Appwrite requires absolute URL
  const redirect = `${url}/reset-password`;
  return await account.createRecovery(e, redirect);
}

export async function resetPasswordWithRecovery(userId, secret, password, passwordAgain) {
  const p = String(password || "");
  const p2 = String(passwordAgain || "");
  if (!p || !p2) throw new Error('Missing required parameter: "password"');
  if (p !== p2) throw new Error("Passwords do not match.");
  return await account.updateRecovery(String(userId), String(secret), p, p2);
}

// --- Back-compat aliases (so your existing pages/components stop failing imports) ---
export const registerUser = async (fullName, email, password) => signUp({ fullName, email, password });
export const loginWithEmailPassword = async (email, password) => signIn(email, password);
export const logoutUser = async () => signOut();

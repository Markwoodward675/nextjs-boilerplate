"use client";

/**
 * lib/api.js (Client-safe)
 * - Uses Appwrite JS SDK in the browser for auth + user reads
 * - Uses Next.js API routes (fetch) for server-only actions (email verify code, admin tasks, etc.)
 */

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ----------------------------- ENV + CONSTANTS ----------------------------- */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Collections (match your console IDs)
const COL_PROFILES = "profiles";
const COL_WALLETS = "wallets";
const COL_TX = "transactions";
const COL_ALERTS = "alerts";
const COL_VERIFY = "verify_codes";

const COL_AFF_ACCOUNT = "affiliate_account";
const COL_AFF_REFERRALS = "affiliate_referrals";
const COL_AFF_COMMISSIONS = "affiliate_commissions";

// Bucket (your single uploads bucket id)
const UPLOADS_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_UPLOADS_BUCKET_ID || "uploads";

/* ------------------------------ APPWRITE CLIENT ---------------------------- */

function assertEnv() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  }
  if (!DB_ID) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  }
}

const client = new Client();

try {
  assertEnv();
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} catch (e) {
  // Don’t crash build — only crash when actually used in runtime.
  // Pages that call API will show error via getErrorMessage().
}

const account = new Account(client);
const db = new Databases(client);
const storage = new Storage(client);

/* --------------------------------- HELPERS -------------------------------- */

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

function recoveryRedirectUrl() {
  // Appwrite requires a redirect URL for recovery.
  // Set NEXT_PUBLIC_APPWRITE_RECOVERY_URL to your domain reset page if you want.
  const envUrl = process.env.NEXT_PUBLIC_APPWRITE_RECOVERY_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  const origin = safeOrigin();
  return origin ? `${origin}/reset-password` : "";
}

/* ------------------------------- AUTH (SDK) -------------------------------- */

export async function getCurrentUser() {
  return await account.get();
}

export async function signUp({ fullName, email, password }) {
  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  const name = String(fullName || "").trim();

  // Create Appwrite account
  await account.create(ID.unique(), email.trim(), password, name || undefined);

  // Create session immediately (so verify page can run)
  await signIn(email, password);

  return true;
}

export async function signIn(email, password) {
  const e = String(email || "").trim();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // SDK compatibility:
  // v13+: createEmailPasswordSession
  // older: createEmailSession
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(e, p);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(e, p);
  }

  throw new Error("Appwrite SDK session method not found. Check appwrite package version.");
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}

/* -------------------------- PASSWORD RECOVERY (SDK) ------------------------- */

export async function requestPasswordRecovery(email) {
  const e = String(email || "").trim();
  if (!e) throw new Error('Missing required parameter: "email"');

  const redirectUrl = recoveryRedirectUrl();
  if (!redirectUrl) throw new Error("Missing redirect URL for recovery.");

  // Appwrite: sends recovery email
  return await account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1) throw new Error('Missing required parameter: "password"');
  if (p1 !== p2) throw new Error("Passwords do not match.");

  return await account.updateRecovery(uid, sec, p1, p2);
}

/* -------------------------- BOOTSTRAP + PROFILES --------------------------- */

export async function ensureUserBootstrap() {
  const user = await getCurrentUser();

  // Load or create profiles document
  let profile = null;

  const list = await db.listDocuments(DB_ID, COL_PROFILES, [
    Query.equal("userId", user.$id),
    Query.limit(1),
  ]);

  if (list.total > 0) {
    profile = list.documents[0];
  } else {
    // create minimal profile that matches your schema
    profile = await db.createDocument(DB_ID, COL_PROFILES, ID.unique(), {
      userId: user.$id,
      email: user.email,
      fullName: user.name || "",
      country: "",
      kycStatus: "unverified",
      verificationCodeVerified: false,
      createdAt: nowISO(),
      verifiedAt: "",
    });
  }

  return { user, profile };
}

/* ------------------- VERIFY CODE (EMAIL via API routes) -------------------- */
/**
 * Your routes exist:
 * - app/api/auth/send-verify-code/route.js
 * - app/api/auth/verify-code/route.js
 */
export async function createOrRefreshVerifyCode(userId) {
  if (!userId) throw new Error("Missing userId.");

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
  if (!userId) throw new Error("Missing userId.");
  const c = String(code || "").trim();
  if (!/^\d{6}$/.test(c)) throw new Error("Enter a valid 6-digit code.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}

/* ------------------------------ DATA HELPERS ------------------------------- */

export async function getUserWallets(userId) {
  if (!userId) throw new Error("Missing userId.");
  const res = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", userId),
    Query.limit(50),
  ]);
  return res.documents;
}

export async function getUserTransactions(userId) {
  if (!userId) throw new Error("Missing userId.");
  const res = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);
  return res.documents;
}

export async function getUserAlerts(userId) {
  if (!userId) throw new Error("Missing userId.");
  const res = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  return res.documents;
}

/* ------------------------- WRITE HELPERS USED BY PAGES ---------------------- */

export async function createTransaction({
  userId,
  walletId,
  amount,
  currencyType,
  transactionType,
  status = "pending",
  meta = "",
}) {
  if (!userId) throw new Error("Missing userId.");
  if (!walletId) throw new Error("Missing walletId.");
  if (amount == null) throw new Error("Missing amount.");

  return await db.createDocument(DB_ID, COL_TX, ID.unique(), {
    transactionId: crypto?.randomUUID?.() || ID.unique(),
    userId,
    walletId,
    amount: Number(amount),
    currencyType,
    transactionType,
    transactionDate: new Date().toISOString(),
    status,
    meta: String(meta || ""),
    type: String(transactionType || ""),
  });
}

export async function createAlert({
  userId,
  title,
  body,
  severity = "low",
  category = "",
}) {
  if (!userId) throw new Error("Missing userId.");
  return await db.createDocument(DB_ID, COL_ALERTS, ID.unique(), {
    alertId: crypto?.randomUUID?.() || ID.unique(),
    alertTitle: title || "",
    alertMessage: body || "",
    title: title || "",
    body: body || "",
    severity,
    alertCategory: category || null,
    userId,
    isResolved: false,
    createdAt: nowISO(),
  });
}

export async function updateUserProfile(userId, patch) {
  if (!userId) throw new Error("Missing userId.");

  // Update the `profiles` collection only (avoid "displayName" issues elsewhere)
  const list = await db.listDocuments(DB_ID, COL_PROFILES, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);
  if (list.total < 1) throw new Error("Profile not found.");

  const doc = list.documents[0];

  // Only allow known profile fields (prevents invalid attribute errors)
  const safe = {
    fullName: patch?.fullName ?? doc.fullName ?? "",
    country: patch?.country ?? doc.country ?? "",
    kycStatus: patch?.kycStatus ?? doc.kycStatus ?? "",
  };

  return await db.updateDocument(DB_ID, COL_PROFILES, doc.$id, safe);
}

export async function uploadProfilePicture(file) {
  if (!file) throw new Error("Select a file first.");
  const up = await storage.createFile(UPLOADS_BUCKET_ID, ID.unique(), file);
  return up; // returns fileId etc
}

export async function uploadKycDocument(file) {
  if (!file) throw new Error("Select a file first.");
  const up = await storage.createFile(UPLOADS_BUCKET_ID, ID.unique(), file);
  return up;
}

/* ---------------------------- AFFILIATE HELPERS ---------------------------- */

export async function ensureAffiliateAccount(userId) {
  if (!userId) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_AFF_ACCOUNT, [
    Query.equal("userId", userId),
    Query.limit(1),
  ]);

  if (list.total > 0) return list.documents[0];

  return await db.createDocument(DB_ID, COL_AFF_ACCOUNT, ID.unique(), {
    commissionRate: 0,
    totalEarned: 0,
    joinDate: new Date().toISOString(),
    status: "active",
    userId,
    affiliateId: Math.floor(Math.random() * 900000 + 100000),
  });
}

export async function getAffiliateSummary(userId) {
  if (!userId) throw new Error("Missing userId.");

  const acct = await ensureAffiliateAccount(userId);

  const refs = await db.listDocuments(DB_ID, COL_AFF_REFERRALS, [
    Query.equal("referrerAffiliateId", acct.affiliateId),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);

  const comm = await db.listDocuments(DB_ID, COL_AFF_COMMISSIONS, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);

  return {
    account: acct,
    referrals: refs.documents,
    commissions: comm.documents,
  };
}
// ---------------- PASSWORD RECOVERY ----------------

export async function resetPasswordWithRecovery({
  userId,
  secret,
  password,
  confirmPassword,
}) {
  if (!userId || !secret) {
    throw new Error("Invalid or expired recovery link.");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  await account.updateRecovery(userId, secret, password, confirmPassword);
  return true;
}

// ---------------- SIGN OUT ----------------

export async function logoutUser() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}

// lib/api.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/** ---------------- ENV (PUBLIC) ---------------- */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

const COL = {
  USER_PROFILE: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile",
  WALLETS: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
  TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
  ALERTS: process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
  AFFILIATE_ACCOUNT:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account",
};

export { ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ID, Query };

/** ---------------- SDK SINGLETON ---------------- */
const client = new Client();
if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { client, account, databases, storage };

/** ---------------- HELPERS ---------------- */
const isBrowser = typeof window !== "undefined";

function nowIso() {
  return new Date().toISOString();
}

function assertConfigured() {
  const missing = [];
  if (!ENDPOINT) missing.push("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!PROJECT_ID) missing.push("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (missing.length) {
    throw new Error(
      `Appwrite is not configured. Missing: ${missing.join(", ")}`
    );
  }
}

function assertDbConfigured() {
  assertConfigured();
  if (!DB_ID) {
    throw new Error(
      "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID) in Vercel."
    );
  }
}

function looksLikeSessionActiveError(e) {
  const msg = String(e?.message || "");
  return (
    /session is active/i.test(msg) ||
    /prohibited when a session is active/i.test(msg)
  );
}

export function getErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  // Appwrite SDK often uses err.message
  const msg = String(err?.message || "").trim();
  if (msg) return msg;

  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

/**
 * Removes unknown fields automatically if Appwrite complains:
 * "Invalid document structure: Unknown attribute: \"x\""
 */
async function safeUpdateDocument(databaseId, collectionId, documentId, data) {
  const payload = { ...(data || {}) };
  let tries = 0;

  while (tries < 8) {
    tries += 1;
    try {
      return await databases.updateDocument(databaseId, collectionId, documentId, payload);
    } catch (e) {
      const msg = String(e?.message || "");
      const m = msg.match(/Unknown attribute:\s*\"([^\"]+)\"/i);
      if (m?.[1]) {
        delete payload[m[1]];
        continue;
      }
      throw e;
    }
  }
  // If we somehow kept failing, throw last known
  return await databases.updateDocument(databaseId, collectionId, documentId, payload);
}

async function safeCreateDocument(databaseId, collectionId, documentId, data) {
  const payload = { ...(data || {}) };
  let tries = 0;

  while (tries < 8) {
    tries += 1;
    try {
      return await databases.createDocument(databaseId, collectionId, documentId, payload);
    } catch (e) {
      const msg = String(e?.message || "");
      const m = msg.match(/Unknown attribute:\s*\"([^\"]+)\"/i);
      if (m?.[1]) {
        delete payload[m[1]];
        continue;
      }
      throw e;
    }
  }
  return await databases.createDocument(databaseId, collectionId, documentId, payload);
}

function getPublicBaseUrl() {
  // Always prefer runtime origin (prevents invalid URI)
  if (isBrowser && window?.location?.origin) return window.location.origin;

  // fallback for non-browser usage (rare in this file)
  const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!envBase) return "";
  try {
    return new URL(envBase).origin;
  } catch {
    return "";
  }
}

/** ---------------- APPWRITE AUTH COMPAT ---------------- */
async function createEmailSession(email, password) {
  // Compatibility across SDK versions
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }
  if (typeof account.createSession === "function") {
    return await account.createSession(email, password);
  }
  throw new Error(
    "Your Appwrite web SDK does not support email sessions. Ensure dependency `appwrite` is v13+ and rebuild."
  );
}

async function deleteCurrentSession() {
  try {
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return;
    }
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
      return;
    }
  } catch {
    // ignore
  }
}

/** ---------------- AUTH API ---------------- */
export async function getCurrentUser() {
  assertConfigured();
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function signOut() {
  assertConfigured();
  await deleteCurrentSession();
  return true;
}

/**
 * signIn(email,password) OR signIn({email,password})
 * ✅ If a session is active, it auto-replaces it.
 */
export async function signIn(a, b) {
  assertConfigured();

  const email = typeof a === "object" ? String(a?.email || "").trim() : String(a || "").trim();
  const password = typeof a === "object" ? String(a?.password || "") : String(b || "");

  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  try {
    await createEmailSession(email, password);
    return true;
  } catch (e) {
    if (looksLikeSessionActiveError(e)) {
      await deleteCurrentSession();
      await createEmailSession(email, password);
      return true;
    }
    throw e;
  }
}

/**
 * signUp({fullName,email,password,referralId})
 * If Appwrite returns 409 conflict, throw a tagged error so UI can route.
 */
export async function signUp({ fullName, email, password, referralId = "" }) {
  assertConfigured();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  const n = String(fullName || "").trim();

  if (!n) throw new Error('Missing required parameter: "fullName"');
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  try {
    // Appwrite: account.create(userId, email, password, name)
    await account.create(ID.unique(), e, p, n);

    // Sign in immediately
    await signIn(e, p);

    // Bootstrap profile + wallets
    await ensureUserBootstrap({ referralId });

    return true;
  } catch (err) {
    const msg = getErrorMessage(err);

    // Conflict user exists
    if (/already exists/i.test(msg) || String(err?.code) === "409") {
      const e2 = new Error("ACCOUNT_EXISTS");
      e2.code = "ACCOUNT_EXISTS";
      e2.email = e;
      throw e2;
    }

    throw err;
  }
}

/**
 * Server check (admin) to know whether an email is verified.
 * Requires API route below.
 */
export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  const res = await fetch("/api/auth/account-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: e }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to check account status.");
  return data;
}

/** ---------------- BOOTSTRAP (SSoT = user_profile) ---------------- */
async function getProfileDoc(userId) {
  assertDbConfigured();

  // Prefer docId = userId (fast)
  try {
    return await databases.getDocument(DB_ID, COL.USER_PROFILE, userId);
  } catch {
    // fallback: find by userId field (in case docId differs)
    try {
      const list = await databases.listDocuments(DB_ID, COL.USER_PROFILE, [
        Query.equal("userId", userId),
        Query.limit(1),
      ]);
      return list?.documents?.[0] || null;
    } catch {
      return null;
    }
  }
}

async function upsertProfileDoc(user, patch = {}) {
  assertDbConfigured();

  const userId = user?.$id;
  if (!userId) throw new Error("Missing userId.");

  const base = {
    userId,
    email: user?.email || "",
    fullName: user?.name || "",
    // Keep booleans/strings only that your schema supports
    verificationCodeVerified: false,
    kycStatus: "not_submitted",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...(patch || {}),
  };

  const existing = await getProfileDoc(userId);

  if (existing?.$id) {
    // Update existing doc
    return await safeUpdateDocument(DB_ID, COL.USER_PROFILE, existing.$id, {
      ...base,
      createdAt: existing.createdAt || base.createdAt,
      updatedAt: nowIso(),
    });
  }

  // Create doc with docId=userId (strong convention)
  return await safeCreateDocument(DB_ID, COL.USER_PROFILE, userId, base);
}

async function ensureWallets(userId) {
  assertDbConfigured();

  const list = await databases.listDocuments(DB_ID, COL.WALLETS, [
    Query.equal("userId", userId),
    Query.limit(50),
  ]);

  if (list?.documents?.length) return list.documents;

  const createdDate = nowIso();
  const wallets = [
    { currencyType: "USD", balance: 0, isActive: true },
    { currencyType: "USD", balance: 0, isActive: true },
    { currencyType: "USD", balance: 0, isActive: true },
  ];

  const out = [];
  for (const w of wallets) {
    const doc = await safeCreateDocument(DB_ID, COL.WALLETS, ID.unique(), {
      walletId: ID.unique(),
      userId,
      currencyType: w.currencyType,
      balance: w.balance,
      isActive: w.isActive,
      createdDate,
      updatedDate: createdDate,
    });
    out.push(doc);
  }
  return out;
}

/**
 * ✅ Main bootstrap used everywhere
 * - gets user
 * - ensures `user_profile` doc exists
 * - ensures wallets exist
 */
export async function ensureUserBootstrap({ referralId = "" } = {}) {
  assertConfigured();

  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null, wallets: [] };

  const profile = await upsertProfileDoc(user, referralId ? { referrerAffiliateId: Number(referralId) || null } : {});
  const wallets = await ensureWallets(user.$id);

  return { user, profile, wallets };
}

/** ---------------- VERIFY CODE (EMAIL via API routes) ---------------- */
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
  return data;
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
  return data;
}

/** ---------------- PASSWORD RECOVERY ---------------- */
export async function requestPasswordRecovery(email) {
  assertConfigured();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  const base = getPublicBaseUrl();
  if (!base) throw new Error("Missing redirect URL for recovery. Set NEXT_PUBLIC_APP_URL or open from a valid domain.");

  // You should create /reset-password page to complete recovery
  const redirectUrl = `${base}/reset-password`;

  try {
    await account.createRecovery(e, redirectUrl);
    return true;
  } catch (err) {
    // Appwrite may throw "Invalid `url` param"
    const msg = getErrorMessage(err);
    if (/Invalid `url` param/i.test(msg) || /Invalid URI/i.test(msg)) {
      throw new Error(
        `Invalid recovery redirect URL. Ensure your site is added in Appwrite → Project → Platforms (Web). URL used: ${redirectUrl}`
      );
    }
    throw err;
  }
}

export async function completePasswordRecovery({ userId, secret, password }) {
  assertConfigured();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pass = String(password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!pass || pass.length < 8) throw new Error("Password must be at least 8 characters.");

  await account.updateRecovery(uid, sec, pass, pass);
  return true;
}

/** ---------------- TRANSACTIONS / ALERTS (for your pages) ---------------- */
export async function createTransaction({
  userId,
  walletId,
  amount,
  currencyType, // USD/EUR/JPY/GBP
  transactionType, // deposit/withdraw/...
  status = "pending",
  meta = "",
}) {
  assertDbConfigured();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");
  if (!walletId) throw new Error("Missing walletId.");

  const doc = await safeCreateDocument(DB_ID, COL.TRANSACTIONS, ID.unique(), {
    transactionId: ID.unique(),
    userId: uid,
    walletId: String(walletId),
    amount: Number(amount || 0),
    currencyType: String(currencyType || "USD"),
    transactionType: String(transactionType || "deposit"),
    transactionDate: nowIso(),
    status,
    meta: String(meta || ""),
    type: String(transactionType || ""),
  });

  return doc;
}

export async function createAlert({
  userId,
  alertTitle,
  alertMessage,
  severity = "low", // low/medium/high/critical
  alertCategory = null,
}) {
  assertDbConfigured();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  return await safeCreateDocument(DB_ID, COL.ALERTS, ID.unique(), {
    alertId: ID.unique(),
    alertTitle: String(alertTitle || "Notice"),
    alertMessage: String(alertMessage || ""),
    severity: String(severity || "low"),
    alertCategory: alertCategory ? String(alertCategory) : null,
    userId: uid,
    isResolved: false,
    title: String(alertTitle || "Notice"),
    body: String(alertMessage || ""),
    createdAt: nowIso(),
  });
}

export async function updateUserProfile(userId, patch = {}) {
  assertDbConfigured();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  // Never write fields you said cause issues
  const {
    displayName, // ignore
    verifiedAt, // ignore
    ...safePatch
  } = patch || {};

  const existing = await getProfileDoc(uid);
  if (!existing?.$id) throw new Error("Profile not found.");

  return await safeUpdateDocument(DB_ID, COL.USER_PROFILE, existing.$id, {
    ...safePatch,
    updatedAt: nowIso(),
  });
}

/**
 * Upload profile picture → stores fileId in user_profile (no URL overflow)
 */
export async function uploadProfilePicture(userId, file) {
  assertDbConfigured();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");
  if (!file) throw new Error("Missing file.");

  const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);

  await updateUserProfile(userId, {
    profileImageFileId: uploaded.$id,
    profileImageUrl: uploaded.$id, // keep within 64 chars; compute real URL in UI if needed
  });

  return uploaded;
}

/**
 * Upload KYC docs: front/back/selfie (stores JSON file map in kycDocFileName if needed)
 */
export async function uploadKycDocument(userId, { front, back, selfie } = {}) {
  assertDbConfigured();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");

  const out = {};
  if (front) out.front = (await storage.createFile(BUCKET_ID, ID.unique(), front)).$id;
  if (back) out.back = (await storage.createFile(BUCKET_ID, ID.unique(), back)).$id;
  if (selfie) out.selfie = (await storage.createFile(BUCKET_ID, ID.unique(), selfie)).$id;

  if (!out.front && !out.back && !out.selfie) {
    throw new Error("Please upload at least one KYC image.");
  }

  const firstId = out.front || out.back || out.selfie;

  await updateUserProfile(userId, {
    kycDocFileId: firstId,
    kycDocFileName: JSON.stringify(out).slice(0, 255),
    kycStatus: "pending",
  });

  return out;
}

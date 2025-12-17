"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* =========================================================
   ENV / CONFIG
========================================================= */

function env(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

const ENDPOINT = env("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const PROJECT_ID = env("NEXT_PUBLIC_APPWRITE_PROJECT_ID");

// DB (support your mixed env names)
const DB_ID =
  env("NEXT_PUBLIC_APPWRITE_DATABASE_ID") ||
  env("NEXT_PUBLIC_APPWRITE_DB_ID") ||
  env("NEXT_PUBLIC_APPWRITE_DB_ID");

// Collection IDs (defaults match your actual names)
const COL_USER_PROFILE = env("APPWRITE_USERS_COLLECTION_ID") || "user_profile";
const COL_WALLETS = env("NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID") || "wallets";
const COL_TX = env("NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID") || "transactions";
const COL_ALERTS = env("NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID") || "alerts";
const COL_VERIFY_CODES =
  env("APPWRITE_VERIFY_CODES_COLLECTION_ID") || "verify_codes";

// Storage bucket (single bucket)
const BUCKET_ID = env("NEXT_PUBLIC_APPWRITE_BUCKET_ID");

// Public app URL for recovery links
const PUBLIC_APP_URL = env("NEXT_PUBLIC_APP_URL"); // e.g. https://day-trader-insights.com

function ensureClientConfigured() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  if (!DB_ID) {
    throw new Error(
      "Appwrite DB is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }
}

/* =========================================================
   SINGLETON CLIENT
========================================================= */

const client = new Client();
if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

const account = new Account(client);
const db = new Databases(client);
const storage = new Storage(client);

/* =========================================================
   UTILITIES
========================================================= */

export function getErrorMessage(err, fallback = "Something went wrong.") {
  try {
    if (!err) return fallback;
    if (typeof err === "string") return err;

    const anyErr = err;
    const msg =
      anyErr?.message ||
      anyErr?.response?.message ||
      anyErr?.response ||
      anyErr?.error ||
      fallback;

    return String(msg).replace(/^AppwriteException:\s*/i, "");
  } catch {
    return fallback;
  }
}

function normalizeCreds(a, b) {
  // supports: signIn(email, pass) OR signIn({email, password})
  if (a && typeof a === "object") {
    return {
      email: String(a.email || "").trim(),
      password: String(a.password || "").trim(),
    };
  }
  return {
    email: String(a || "").trim(),
    password: String(b || "").trim(),
  };
}

function normalizeSignup(inputA, inputB, inputC, inputD) {
  // supports:
  // signUp({ fullName, email, password, referralId })
  // signUp(fullName, email, password, referralId)
  if (inputA && typeof inputA === "object") {
    return {
      fullName: String(inputA.fullName || "").trim(),
      email: String(inputA.email || "").trim(),
      password: String(inputA.password || "").trim(),
      referralId: String(inputA.referralId || "").trim(),
    };
  }
  return {
    fullName: String(inputA || "").trim(),
    email: String(inputB || "").trim(),
    password: String(inputC || "").trim(),
    referralId: String(inputD || "").trim(),
  };
}

function isBrowser() {
  return typeof window !== "undefined";
}

function absUrl(pathname) {
  // Always return a VALID absolute URL (fixes invalid url param)
  const base =
    (PUBLIC_APP_URL && PUBLIC_APP_URL.startsWith("http")
      ? PUBLIC_APP_URL
      : "") ||
    (isBrowser() ? window.location.origin : "");

  const safeBase = base.startsWith("http") ? base : "";
  if (!safeBase) throw new Error("Missing NEXT_PUBLIC_APP_URL for recovery links.");

  const p = String(pathname || "/").startsWith("/") ? pathname : `/${pathname}`;
  return `${safeBase}${p}`;
}

function uuid36() {
  // wallets.walletId expects size 36 -> use UUID
  if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  // fallback (not perfect but fine for client)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* =========================================================
   APPWRITE METHOD FALLBACKS (fixes “... is not a function”)
========================================================= */

async function createEmailSession(email, password) {
  // Appwrite SDK differences: createEmailPasswordSession vs createEmailSession
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }
  throw new Error("Appwrite SDK missing email session method.");
}

async function deleteCurrentSession() {
  if (typeof account.deleteSession === "function") {
    try {
      await account.deleteSession("current");
      return;
    } catch {}
  }
  if (typeof account.deleteSessions === "function") {
    try {
      await account.deleteSessions();
      return;
    } catch {}
  }
}

async function replaceSessionThenCreate(email, password) {
  try {
    return await createEmailSession(email, password);
  } catch (e) {
    const msg = getErrorMessage(e, "");
    // hardfix: replace active session and retry
    if (/session is active|prohibited when a session is active/i.test(msg)) {
      await deleteCurrentSession();
      return await createEmailSession(email, password);
    }
    throw e;
  }
}

/* =========================================================
   AUTH
========================================================= */

export async function signOut() {
  ensureClientConfigured();
  await deleteCurrentSession();
  return true;
}

export async function signIn(a, b) {
  ensureClientConfigured();
  const { email, password } = normalizeCreds(a, b);

  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  try {
    await replaceSessionThenCreate(email, password);
  } catch (e) {
    const msg = getErrorMessage(e, "Unable to sign in.");
    if (/invalid credentials|unauthorized|user \(role: guest\)/i.test(msg)) {
      throw new Error("Incorrect email or password.");
    }
    throw new Error(msg);
  }

  // bootstrap after login
  const boot = await ensureUserBootstrap();

  // If unverified, attempt sending email code (don’t block sign-in if route fails)
  try {
    if (boot?.user?.$id && !boot?.profile?.verificationCodeVerified) {
      await createOrRefreshVerifyCode(boot.user.$id);
    }
  } catch {}

  return boot;
}

export async function signUp(a, b, c, d) {
  ensureClientConfigured();
  const { fullName, email, password, referralId } = normalizeSignup(a, b, c, d);

  if (!fullName) throw new Error('Missing required parameter: "fullName"');
  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  // create user
  try {
    // account.create(userId, email, password, name)
    await account.create(ID.unique(), email, password, fullName);
  } catch (e) {
    // pass 409 and message to UI
    throw new Error(getErrorMessage(e, "Unable to create account."));
  }

  // create session right away
  await replaceSessionThenCreate(email, password);

  // bootstrap creates user_profile + wallets
  const boot = await ensureUserBootstrap();

  // store referral in user_profile (optional + safe)
  if (referralId && boot?.user?.$id) {
    try {
      await db.updateDocument(DB_ID, COL_USER_PROFILE, boot.user.$id, {
        referrerAffiliateId: Number(referralId) || null,
      });
    } catch {}
  }

  // send verification email code (via your API route)
  try {
    if (boot?.user?.$id) await createOrRefreshVerifyCode(boot.user.$id);
  } catch {}

  return boot;
}

/* =========================================================
   PASSWORD RECOVERY (Appwrite Recovery)
========================================================= */

export async function requestPasswordRecovery(email) {
  ensureClientConfigured();
  const e = String(email || "").trim();
  if (!e) throw new Error('Missing required parameter: "email"');

  // IMPORTANT: Appwrite requires an ABSOLUTE url
  // You can create a page like /verify or /reset-password to handle it.
  const redirectUrl = absUrl("/verify"); // you can change to "/reset-password"

  // SDK method name is consistent: createRecovery(email, url)
  if (typeof account.createRecovery !== "function") {
    throw new Error("Appwrite SDK missing createRecovery().");
  }
  return await account.createRecovery(e, redirectUrl);
}

// If you later implement reset page:
export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  ensureClientConfigured();
  if (!userId || !secret || !password || !passwordAgain) {
    throw new Error("Missing recovery parameters.");
  }
  if (typeof account.updateRecovery !== "function") {
    throw new Error("Appwrite SDK missing updateRecovery().");
  }
  return await account.updateRecovery(userId, secret, password, passwordAgain);
}

/* =========================================================
   BOOTSTRAP (SINGLE SOURCE OF TRUTH: user_profile)
========================================================= */

export async function getCurrentUser() {
  ensureClientConfigured();
  return await account.get();
}

export async function getUserProfile(userId) {
  ensureClientConfigured();
  if (!userId) throw new Error("Missing userId.");
  return await db.getDocument(DB_ID, COL_USER_PROFILE, userId);
}

async function createDefaultUserProfile(user) {
  const now = new Date().toISOString();

  // Only fields that EXIST in your user_profile schema.
  const doc = {
    userId: user.$id,
    email: user.email || "",
    fullName: user.name || null,

    username: null,
    bio: null,
    websiteUrl: null,

    profileImage: null, // you can keep url empty; we will store fileId in profileImageFileId
    profileImageFileId: null,
    profileImageUrl: null,

    kycStatus: null,
    country: null,
    address: null,

    verificationCode: null,
    verificationCodeExpiresAt: null,
    verificationCodeVerified: false,

    role: null,

    kycDocFileId: null,
    kycDocFileName: null,

    countryLocked: false,
    referrerAffiliateId: null,

    createdAt: now,
    updatedAt: now,
  };

  // docId = userId (simple + stable)
  return await db.createDocument(DB_ID, COL_USER_PROFILE, user.$id, doc);
}

async function ensureWalletsForUser(userId) {
  // create 3 wallets if none exist
  try {
    const list = await db.listDocuments(DB_ID, COL_WALLETS, [
      Query.equal("userId", userId),
      Query.limit(50),
    ]);

    if (list?.total > 0) return list.documents || [];

    const now = new Date().toISOString();

    const base = (currencyType, label) => ({
      walletId: uuid36(),
      userId,
      currencyType, // enum in your Appwrite (make sure USD exists)
      balance: 0,
      isActive: true,
      createdDate: now,
      updatedDate: now,
      type: label, // harmless extra (if schema rejects, remove)
    });

    // NOTE: if your wallets.currencyType enum is ONLY USD/EUR/JPY/GBP, keep USD here.
    const docs = [];
    docs.push(await db.createDocument(DB_ID, COL_WALLETS, ID.unique(), base("USD", "main")));
    docs.push(await db.createDocument(DB_ID, COL_WALLETS, ID.unique(), base("USD", "trading")));
    docs.push(await db.createDocument(DB_ID, COL_WALLETS, ID.unique(), base("USD", "affiliate")));
    return docs;
  } catch {
    return [];
  }
}

export async function ensureUserBootstrap() {
  ensureClientConfigured();

  const user = await getCurrentUser().catch(() => null);
  if (!user?.$id) throw new Error("Not signed in.");

  // user_profile is THE source of truth
  let profile = null;
  try {
    profile = await getUserProfile(user.$id);
  } catch {
    profile = await createDefaultUserProfile(user);
  }

  // keep updatedAt fresh
  try {
    await db.updateDocument(DB_ID, COL_USER_PROFILE, user.$id, {
      updatedAt: new Date().toISOString(),
      // never write verifiedAt/displayName (caused your schema errors)
    });
  } catch {}

  // ensure wallets
  const wallets = await ensureWalletsForUser(user.$id);

  return { user, profile, wallets };
}

/* =========================================================
   VERIFY CODE (EMAIL via your API routes)
========================================================= */

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
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");

  // IMPORTANT: update user_profile (source of truth)
  try {
    await db.updateDocument(DB_ID, COL_USER_PROFILE, userId, {
      verificationCodeVerified: true,
      updatedAt: new Date().toISOString(),
    });
  } catch {}

  return data;
}

/* =========================================================
   PROFILE UPDATES + UPLOADS (safe)
========================================================= */

export async function updateUserProfile(userId, patch = {}) {
  ensureClientConfigured();
  if (!userId) throw new Error("Missing userId.");

  // Never send unknown fields like displayName / verifiedAt
  const allowed = [
    "username",
    "fullName",
    "bio",
    "websiteUrl",
    "email",
    "role",
    "kycStatus",
    "verificationCodeVerified",
    "country",
    "address",
    "profileImage",
    "profileImageFileId",
    "profileImageUrl",
    "kycDocFileId",
    "kycDocFileName",
    "countryLocked",
    "referrerAffiliateId",
    "updatedAt",
  ];

  const safe = {};
  for (const k of allowed) {
    if (k in patch) safe[k] = patch[k];
  }
  safe.updatedAt = new Date().toISOString();

  return await db.updateDocument(DB_ID, COL_USER_PROFILE, userId, safe);
}

export async function uploadProfilePicture(userId, file) {
  ensureClientConfigured();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");
  if (!userId) throw new Error("Missing userId.");
  if (!file) throw new Error("Missing file.");

  const created = await storage.createFile(BUCKET_ID, ID.unique(), file);
  await updateUserProfile(userId, {
    profileImageFileId: created.$id,
    profileImageUrl: "", // optional: if you later add preview URL
  });

  return created;
}

export async function uploadKycDocument(userId, file, label = "kyc") {
  ensureClientConfigured();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");
  if (!userId) throw new Error("Missing userId.");
  if (!file) throw new Error("Missing file.");

  const created = await storage.createFile(BUCKET_ID, ID.unique(), file);

  // store as single file id/name (your schema supports one kycDocFileId)
  await updateUserProfile(userId, {
    kycDocFileId: created.$id,
    kycDocFileName: `${label}:${file?.name || created.$id}`,
    kycStatus: "pending",
  });

  return created;
}

/* =========================================================
   WALLETS / TRANSACTIONS / ALERTS
========================================================= */

export async function getUserWallets(userId) {
  ensureClientConfigured();
  if (!userId) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", userId),
    Query.limit(50),
  ]);
  return list.documents || [];
}

export async function getUserTransactions(userId, limit = 50) {
  ensureClientConfigured();
  if (!userId) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.max(1, Math.min(200, Number(limit) || 50))),
  ]);
  return list.documents || [];
}

export async function createTransaction(payload) {
  ensureClientConfigured();
  const p = payload || {};
  const userId = String(p.userId || "").trim();
  if (!userId) throw new Error("Missing userId.");

  // Minimal required fields per your schema
  const doc = {
    transactionId: String(p.transactionId || uuid36()),
    userId,
    walletId: String(p.walletId || ""),
    amount: Number(p.amount || 0),
    currencyType: String(p.currencyType || "USD"),
    transactionType: String(p.transactionType || "deposit"),
    transactionDate: p.transactionDate || new Date().toISOString(),
    status: p.status || "pending",
    meta: typeof p.meta === "string" ? p.meta : JSON.stringify(p.meta || {}),
    type: p.type || " ",
  };

  return await db.createDocument(DB_ID, COL_TX, ID.unique(), doc);
}

export async function getUserAlerts(userId, limit = 50) {
  ensureClientConfigured();
  if (!userId) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.max(1, Math.min(200, Number(limit) || 50))),
  ]);
  return list.documents || [];
}

export async function createAlert(payload) {
  ensureClientConfigured();
  const p = payload || {};
  const userId = String(p.userId || "").trim();
  if (!userId) throw new Error("Missing userId.");

  const doc = {
    alertId: String(p.alertId || uuid36()).slice(0, 50),
    alertTitle: String(p.alertTitle || "Notification").slice(0, 255),
    alertMessage: String(p.alertMessage || "").slice(0, 1000),
    severity: String(p.severity || "low"), // low|medium|high|critical
    alertCategory: p.alertCategory || null,
    userId,
    isResolved: Boolean(p.isResolved || false),
    title: String(p.title || "Notification").slice(0, 64),
    body: String(p.body || "").slice(0, 255),
    createdAt: p.createdAt || new Date().toISOString(),
  };

  return await db.createDocument(DB_ID, COL_ALERTS, ID.unique(), doc);
}

/* =========================================================
   OPTIONAL: status helper used by your signup logic
   (If route doesn't exist, returns null safely)
========================================================= */

export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim();
  if (!e) return null;

  try {
    const res = await fetch(`/api/auth/account-status?email=${encodeURIComponent(e)}`, {
      method: "GET",
      headers: { "accept": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}
// lib/api.js

export async function logoutUser() {
  // If your app uses an API route:
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  return true;
}

/* =========================================================
   EXPORTS (for convenience)
========================================================= */

export { client, account, db, storage, ID, Query };

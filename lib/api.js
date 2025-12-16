"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ===============================
   ENV (NO TOP-LEVEL THROWS)
=============================== */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const COL_PROFILES = process.env.NEXT_PUBLIC_COL_PROFILES || "profiles";
const COL_WALLETS = process.env.NEXT_PUBLIC_COL_WALLETS || "wallets";
const COL_TRANSACTIONS = process.env.NEXT_PUBLIC_COL_TRANSACTIONS || "transactions";
const COL_ALERTS = process.env.NEXT_PUBLIC_COL_ALERTS || "alerts";
const COL_VERIFY_CODES = process.env.NEXT_PUBLIC_COL_VERIFY_CODES || "verify_codes";
const COL_AFFILIATE_ACCOUNTS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_ACCOUNTS || "affiliate_accounts";
const COL_AFFILIATE_COMMISSIONS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_COMMISSIONS || "affiliate_commissions";

// Storage bucket IDs (set these in Vercel env if you use uploads)
const BUCKET_AVATARS = process.env.NEXT_PUBLIC_BUCKET_AVATARS || "avatars";
const BUCKET_KYC = process.env.NEXT_PUBLIC_BUCKET_KYC || "kyc";

/* ===============================
   LAZY INIT (build-safe)
=============================== */
let _client, _account, _db, _storage;

function canInit() {
  return typeof window !== "undefined" && ENDPOINT && PROJECT_ID && DATABASE_ID;
}

function init() {
  if (_client) return true;
  if (!canInit()) return false;

  _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  _account = new Account(_client);
  _db = new Databases(_client);
  _storage = new Storage(_client);
  return true;
}

function requireInit() {
  if (!init()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_DATABASE_ID in Vercel Environment Variables."
    );
  }
  return { account: _account, db: _db, storage: _storage, dbId: DATABASE_ID };
}

/* ===============================
   ERRORS
=============================== */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* ===============================
   SESSION COMPAT
=============================== */
async function createPasswordSession(email, password) {
  const { account } = requireInit();
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  if (typeof account.createSession === "function") {
    return account.createSession(email, password);
  }
  throw new Error("Appwrite SDK does not support email/password sessions.");
}

/* ===============================
   AUTH
=============================== */
export async function signIn({ email, password })
 {
  try {
    const e = String(email || "").trim();
    const p = String(password || "");
    if (!e) throw new Error("Email is required.");
    if (!p) throw new Error("Password is required.");
    return await createPasswordSession(e, p);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to sign in."));
  }
}

export async function signUp(payload) {
  try {
    const { account } = requireInit();
    const fullName = String(payload?.fullName || "").trim();
    const email = String(payload?.email || "").trim();
    const password = String(payload?.password || "");

    if (!fullName) throw new Error("Full name is required.");
    if (!email) throw new Error("Email is required.");
    if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

    await account.create(ID.unique(), email, password, fullName);
    await createPasswordSession(email, password);
    return await account.get();
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create account."));
  }
}

export async function signOut() {
  try {
    const { account } = requireInit();
    if (typeof account.deleteSession === "function") await account.deleteSession("current");
    else if (typeof account.deleteSessions === "function") await account.deleteSessions();
    return true;
  } catch {
    return true;
  }
}

export async function getCurrentUser() {
  try {
    const { account } = requireInit();
    return await account.get();
  } catch {
    return null;
  }
}

/* ===============================
   SAFE DB HELPERS
=============================== */
async function safeGet(colId, docId) {
  try {
    const { db, dbId } = requireInit();
    return await db.getDocument(dbId, colId, docId);
  } catch {
    return null;
  }
}
async function safeList(colId, queries = []) {
  try {
    const { db, dbId } = requireInit();
    const res = await db.listDocuments(dbId, colId, queries);
    return res?.documents || [];
  } catch {
    return [];
  }
}
async function safeCreate(colId, docId, data) {
  const { db, dbId } = requireInit();
  return db.createDocument(dbId, colId, docId, data);
}
async function safeUpdate(colId, docId, data) {
  const { db, dbId } = requireInit();
  return db.updateDocument(dbId, colId, docId, data);
}

/* ===============================
   BOOTSTRAP (NO-ARG + COMPAT)
=============================== */
export async function ensureUserBootstrap() {
  const { account } = requireInit();
  const user = await account.get();
  return ensureUserBootstrapWithUser(user);
}
export async function ensureUserBootstrapWithUser(user) {
  try {
    if (!user?.$id) throw new Error("Invalid session.");

    let profile = await safeGet(COL_PROFILES, user.$id);
    if (!profile) {
      profile = await safeCreate(COL_PROFILES, user.$id, {
        userId: user.$id,
        email: user.email,
        fullName: user.name || "",
        country: "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: new Date().toISOString(),
      });
    }

    // best-effort default wallets
    const wallets = await safeList(COL_WALLETS, [Query.equal("userId", user.$id), Query.limit(50)]);
    if (!wallets.length) {
      const now = new Date().toISOString();
      const defaults = [
        { type: "main", name: "Main wallet", balance: 0 },
        { type: "trading", name: "Trading wallet", balance: 0 },
        { type: "affiliate", name: "Affiliate wallet", balance: 0 },
      ];
      for (const w of defaults) {
        try {
          await safeCreate(COL_WALLETS, ID.unique(), {
            userId: user.$id,
            type: w.type,
            name: w.name,
            balance: w.balance,
            currency: "USD",
            createdAt: now,
          });
        } catch {}
      }
    }

    return { user, profile };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to bootstrap user."));
  }
}

/* ===============================
   DATA (used across pages)
=============================== */
export async function getUserProfile(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  const p = await safeGet(COL_PROFILES, id);
  if (!p) throw new Error("Profile not found.");
  return p;
}

export async function getUserWallets(userId) {
  const id = String(userId || "").trim();
  if (!id) return [];
  return safeList(COL_WALLETS, [Query.equal("userId", id), Query.orderAsc("type"), Query.limit(100)]);
}

export async function getUserTransactions(userId) {
  const id = String(userId || "").trim();
  if (!id) return [];
  return safeList(COL_TRANSACTIONS, [Query.equal("userId", id), Query.orderDesc("$createdAt"), Query.limit(50)]);
}

export async function getUserAlerts(userId) {
  const id = String(userId || "").trim();
  if (!id) return [];
  return safeList(COL_ALERTS, [Query.equal("userId", id), Query.orderDesc("$createdAt"), Query.limit(50)]);
}

/* ===============================
   REQUIRED MISSING EXPORTS
=============================== */

// createAlert(userId, title, body)
export async function createAlert(userId, title, body) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");
    await safeCreate(COL_ALERTS, ID.unique(), {
      userId: id,
      title: String(title || "Notification"),
      body: String(body || ""),
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create alert."));
  }
}

// createTransaction({ userId, type, amount, currency, status, meta })
export async function createTransaction(tx) {
  try {
    const userId = String(tx?.userId || "").trim();
    if (!userId) throw new Error("Missing userId.");

    const doc = await safeCreate(COL_TRANSACTIONS, ID.unique(), {
      userId,
      type: String(tx?.type || "unknown"),
      amount: Number(tx?.amount || 0),
      currency: String(tx?.currency || "USD"),
      status: String(tx?.status || "pending"),
      meta: tx?.meta || {},
      createdAt: new Date().toISOString(),
    });

    return doc;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create transaction."));
  }
}

// updateUserProfile(userId, patch)
export async function updateUserProfile(userId, patch) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");
    const safePatch = patch && typeof patch === "object" ? patch : {};
    return await safeUpdate(COL_PROFILES, id, safePatch);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to update profile."));
  }
}

// uploadProfilePicture(file) -> returns { fileId, url? }
export async function uploadProfilePicture(file) {
  try {
    const { storage } = requireInit();
    if (!file) throw new Error("No file selected.");
    const created = await storage.createFile(BUCKET_AVATARS, ID.unique(), file);
    return { fileId: created.$id };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to upload profile picture."));
  }
}

// uploadKycDocument(file) -> returns { fileId }
export async function uploadKycDocument(file) {
  try {
    const { storage } = requireInit();
    if (!file) throw new Error("No file selected.");
    const created = await storage.createFile(BUCKET_KYC, ID.unique(), file);
    return { fileId: created.$id };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to upload KYC document."));
  }
}

/* ===============================
   AFFILIATE missing exports
=============================== */
export async function ensureAffiliateAccount(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");

    // docId = userId pattern
    const direct = await safeGet(COL_AFFILIATE_ACCOUNTS, id);
    if (direct) return direct;

    // create basic account
    return await safeCreate(COL_AFFILIATE_ACCOUNTS, id, {
      userId: id,
      clicks: 0,
      signups: 0,
      depositors: 0,
      commissionTotal: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to ensure affiliate account."));
  }
}

export async function getAffiliateSummary(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) return { commissionsCount: 0, totalCommission: 0 };

    const commissions = await safeList(COL_AFFILIATE_COMMISSIONS, [
      Query.equal("userId", id),
      Query.limit(200),
    ]);
    const total = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return { commissionsCount: commissions.length, totalCommission: total };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load affiliate summary."));
  }
}

/* ===============================
   6-DIGIT VERIFY FLOW
=============================== */
export async function createOrRefreshVerifyCode(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const existing = await safeGet(COL_VERIFY_CODES, id);
    if (existing) {
      await safeUpdate(COL_VERIFY_CODES, id, { userId: id, code, used: false, createdAt: now });
    } else {
      await safeCreate(COL_VERIFY_CODES, id, { userId: id, code, used: false, createdAt: now });
    }

    // also notify in alerts
    try {
      await createAlert(id, "Your access code", `Your 6-digit access code is: ${code}`);
    } catch {}

    return { code };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to generate verification code."));
  }
}

export async function verifySixDigitCode(userId, code) {
  try {
    const id = String(userId || "").trim();
    const cleaned = String(code || "").trim();
    if (!id) throw new Error("Missing userId.");
    if (!/^\d{6}$/.test(cleaned)) throw new Error("Code must be 6 digits.");

    const doc = await safeGet(COL_VERIFY_CODES, id);
    if (!doc) throw new Error("No code found. Generate a new one.");
    if (doc.used) throw new Error("Code already used. Generate a new one.");
    if (String(doc.code) !== cleaned) throw new Error("Invalid code.");

    await safeUpdate(COL_VERIFY_CODES, id, { used: true, usedAt: new Date().toISOString() });
    await safeUpdate(COL_PROFILES, id, { verificationCodeVerified: true, verifiedAt: new Date().toISOString() });

    return true;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to verify code."));
  }
}

/* ===============================
   LEGACY ALIASES (old pages)
=============================== */
export const loginWithEmailPassword = async (email, password) => signIn({ email, password });
export const registerUser = async (payload) => signUp(payload);
export const logoutUser = async () => signOut();

// Some older verify pages import this
export async function resendVerificationEmail() {
  return true;
}

/* Namespace (helps if any file does import * as a) */
export const api = {
  getErrorMessage,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  ensureUserBootstrap,
  ensureUserBootstrapWithUser,
  getUserProfile,
  getUserWallets,
  getUserTransactions,
  getUserAlerts,
  createAlert,
  createTransaction,
  updateUserProfile,
  uploadProfilePicture,
  uploadKycDocument,
  ensureAffiliateAccount,
  getAffiliateSummary,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  loginWithEmailPassword,
  registerUser,
  logoutUser,
  resendVerificationEmail,
};

export { ID, Query };

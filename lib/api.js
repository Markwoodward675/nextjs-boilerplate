"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ===============================
   ENV
=============================== */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Collection IDs (override if your IDs differ)
const COL_PROFILES = process.env.NEXT_PUBLIC_COL_PROFILES || "profiles";
const COL_WALLETS = process.env.NEXT_PUBLIC_COL_WALLETS || "wallets";
const COL_TRANSACTIONS =
  process.env.NEXT_PUBLIC_COL_TRANSACTIONS || "transactions";
const COL_ALERTS = process.env.NEXT_PUBLIC_COL_ALERTS || "alerts";

const COL_AFFILIATE_ACCOUNTS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_ACCOUNTS || "affiliate_accounts";
const COL_AFFILIATE_COMMISSIONS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_COMMISSIONS || "affiliate_commissions";

const BUCKET_AVATARS = process.env.NEXT_PUBLIC_BUCKET_AVATARS || "avatars";
const BUCKET_KYC = process.env.NEXT_PUBLIC_BUCKET_KYC || "kyc";

// Recommended: set on Vercel
// NEXT_PUBLIC_APP_URL=https://day-trader-insights.com
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

/* ===============================
   LAZY INIT (build-safe)
=============================== */
let _client, _account, _db, _storage;

function canInit() {
  return (
    typeof window !== "undefined" &&
    !!ENDPOINT &&
    !!PROJECT_ID &&
    !!DATABASE_ID
  );
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
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_DATABASE_ID in Vercel Env Vars."
    );
  }
  return { account: _account, db: _db, storage: _storage, dbId: DATABASE_ID };
}

function getAppOrigin() {
  if (APP_URL && String(APP_URL).trim()) return String(APP_URL).trim();
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  return "";
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

function getAppwriteCode(err) {
  return (
    err?.code ||
    err?.response?.code ||
    err?.response?.statusCode ||
    err?.response?.status ||
    err?.status ||
    null
  );
}

function isMissingCollectionError(err) {
  const m = String(err?.message || err?.response?.message || "");
  return /Collection with the requested ID .* could not be found/i.test(m);
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
/**
 * Supports:
 *  - signIn(email, password)
 *  - signIn({ email, password })
 */
export async function signIn(emailOrObj, passwordMaybe) {
  try {
    const email =
      typeof emailOrObj === "object" && emailOrObj !== null
        ? emailOrObj.email
        : emailOrObj;

    const password =
      typeof emailOrObj === "object" && emailOrObj !== null
        ? emailOrObj.password
        : passwordMaybe;

    const e = String(email || "").trim();
    const p = String(password || "");

    if (!e) throw new Error("Email is required.");
    if (!p) throw new Error("Password is required.");

    return await createPasswordSession(e, p);
  } catch (err) {
    const code = getAppwriteCode(err);
    if (code === 401) throw new Error("Wrong email or password.");
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
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    await account.create(ID.unique(), email, password, fullName);
    await createPasswordSession(email, password);
    return await account.get();
  } catch (err) {
    const code = getAppwriteCode(err);
    if (code === 409) throw new Error("Account already exists. Please sign in.");
    throw new Error(getErrorMessage(err, "Unable to create account."));
  }
}

export async function signOut() {
  try {
    const { account } = requireInit();
    if (typeof account.deleteSession === "function")
      await account.deleteSession("current");
    else if (typeof account.deleteSessions === "function")
      await account.deleteSessions();
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
   PASSWORD RECOVERY (Appwrite Cloud)
=============================== */
export async function requestPasswordRecovery(email) {
  try {
    const { account } = requireInit();
    const e = String(email || "").trim().toLowerCase();
    if (!e || !e.includes("@")) throw new Error("Enter a valid email address.");

    const origin = getAppOrigin();
    if (!origin) {
      throw new Error(
        "Missing NEXT_PUBLIC_APP_URL. Set it in Vercel (e.g. https://day-trader-insights.com)."
      );
    }

    // IMPORTANT: The hostname (day-trader-insights.com) MUST be added as a Web Platform in Appwrite Cloud
    const redirectUrl = `${origin}/reset-password`;

    await account.createRecovery(e, redirectUrl);
    return true;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to send reset email."));
  }
}

export async function resetPasswordWithRecovery(userId, secret, password) {
  try {
    const { account } = requireInit();

    const u = String(userId || "").trim();
    const s = String(secret || "").trim();
    const p = String(password || "");

    if (!u || !s) {
      throw new Error(
        "Recovery link is invalid or expired. Request a new reset link."
      );
    }
    if (p.length < 8) throw new Error("Password must be at least 8 characters.");

    await account.updateRecovery(u, s, p, p);
    return true;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to reset password."));
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
   BOOTSTRAP
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
      try {
        profile = await safeCreate(COL_PROFILES, user.$id, {
          userId: user.$id,
          email: user.email,
          fullName: user.name || "",
          country: "",
          kycStatus: "not_submitted",
          verificationCodeVerified: false,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        if (isMissingCollectionError(e)) {
          throw new Error(
            `Collection "${COL_PROFILES}" not found. Create it in Appwrite DB or set NEXT_PUBLIC_COL_PROFILES to your real profiles collection ID.`
          );
        }
        throw e;
      }
    }

    const wallets = await safeList(COL_WALLETS, [
      Query.equal("userId", user.$id),
      Query.limit(50),
    ]);

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
   DATA
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
  return safeList(COL_WALLETS, [
    Query.equal("userId", id),
    Query.orderAsc("type"),
    Query.limit(100),
  ]);
}

export async function getUserTransactions(userId) {
  const id = String(userId || "").trim();
  if (!id) return [];
  return safeList(COL_TRANSACTIONS, [
    Query.equal("userId", id),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);
}

export async function getUserAlerts(userId) {
  const id = String(userId || "").trim();
  if (!id) return [];
  return safeList(COL_ALERTS, [
    Query.equal("userId", id),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);
}

/* ===============================
   REQUIRED EXPORTS (match your pages)
=============================== */
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

export async function createTransaction(tx) {
  try {
    const userId = String(tx?.userId || "").trim();
    if (!userId) throw new Error("Missing userId.");

    return await safeCreate(COL_TRANSACTIONS, ID.unique(), {
      userId,
      type: String(tx?.type || "unknown"),
      amount: Number(tx?.amount || 0),
      currency: String(tx?.currency || "USD"),
      status: String(tx?.status || "pending"),
      meta: tx?.meta || {},
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create transaction."));
  }
}

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
   AFFILIATE
=============================== */
export async function ensureAffiliateAccount(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");

    const direct = await safeGet(COL_AFFILIATE_ACCOUNTS, id);
    if (direct) return direct;

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
   LEGACY ALIASES (prevents “is not a function”)
=============================== */
export const loginWithEmailPassword = async (email, password) =>
  signIn(email, password);
export const registerUser = async (payload) => signUp(payload);
export const logoutUser = async () => signOut();

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
  requestPasswordRecovery,
  resetPasswordWithRecovery,
  loginWithEmailPassword,
  registerUser,
  logoutUser,
};

export { ID, Query };

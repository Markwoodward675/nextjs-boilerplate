"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

/* =========================================================
   ENV (DO NOT THROW AT TOP LEVEL — build-safe)
========================================================= */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Collections (override if your IDs differ)
const COL_PROFILES = process.env.NEXT_PUBLIC_COL_PROFILES || "profiles";
const COL_WALLETS = process.env.NEXT_PUBLIC_COL_WALLETS || "wallets";
const COL_TRANSACTIONS = process.env.NEXT_PUBLIC_COL_TRANSACTIONS || "transactions";
const COL_ALERTS = process.env.NEXT_PUBLIC_COL_ALERTS || "alerts";
const COL_VERIFY_CODES = process.env.NEXT_PUBLIC_COL_VERIFY_CODES || "verify_codes";
const COL_AFFILIATE_ACCOUNTS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_ACCOUNTS || "affiliate_accounts";
const COL_AFFILIATE_COMMISSIONS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_COMMISSIONS || "affiliate_commissions";

/* =========================================================
   LAZY APPWRITE INIT (critical for Next build/prerender)
========================================================= */
let _client = null;
let _account = null;
let _db = null;

function hasEnv() {
  return !!(ENDPOINT && PROJECT_ID && DATABASE_ID);
}

function isBrowser() {
  return typeof window !== "undefined";
}

function init() {
  // Never initialize during SSR/prerender/build
  if (!isBrowser()) return false;
  if (!hasEnv()) return false;

  if (!_client) {
    _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    _account = new Account(_client);
    _db = new Databases(_client);
  }
  return true;
}

function requireInit() {
  if (!init()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_DATABASE_ID in Vercel/Codespaces."
    );
  }
  return { account: _account, db: _db, dbId: DATABASE_ID };
}

/* =========================================================
   ERROR HELPER (always available)
========================================================= */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* =========================================================
   SESSION COMPAT (Appwrite SDK differences)
========================================================= */
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
  throw new Error("Your Appwrite SDK does not support email/password sessions.");
}

/* =========================================================
   AUTH (canonical)
========================================================= */
export async function signIn(email, password) {
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

export async function signUp(input) {
  try {
    const { account } = requireInit();

    const fullName = String(input?.fullName || "").trim();
    const email = String(input?.email || "").trim();
    const password = String(input?.password || "");

    if (!fullName) throw new Error("Full name is required.");
    if (!email) throw new Error("Email is required.");
    if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

    await account.create(ID.unique(), email, password, fullName);
    await createPasswordSession(email, password);

    // Return current user after session
    return await account.get();
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to create account."));
  }
}

export async function signOut() {
  try {
    const { account } = requireInit();
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return true;
    }
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
      return true;
    }
    return true;
  } catch {
    // best effort; UI can still redirect
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

/* =========================================================
   SAFE DB HELPERS
========================================================= */
async function safeGetDocument(colId, docId) {
  try {
    const { db, dbId } = requireInit();
    return await db.getDocument(dbId, colId, docId);
  } catch {
    return null;
  }
}

async function safeListDocuments(colId, queries = []) {
  try {
    const { db, dbId } = requireInit();
    const res = await db.listDocuments(dbId, colId, queries);
    return res?.documents || [];
  } catch {
    return [];
  }
}

async function safeCreateDocument(colId, docId, data) {
  const { db, dbId } = requireInit();
  return db.createDocument(dbId, colId, docId, data);
}

async function safeUpdateDocument(colId, docId, data) {
  const { db, dbId } = requireInit();
  return db.updateDocument(dbId, colId, docId, data);
}

/* =========================================================
   BOOTSTRAP (canonical no-arg)
   ✅ ensureUserBootstrap() ALWAYS exists
========================================================= */
export async function ensureUserBootstrap() {
  const { account } = requireInit();
  const user = await account.get();
  return ensureUserBootstrapWithUser(user);
}

// Backward compatible: accepts a user object
export async function ensureUserBootstrapWithUser(user) {
  try {
    if (!user?.$id) throw new Error("Invalid user session.");

    // Profile docId = userId
    let profile = await safeGetDocument(COL_PROFILES, user.$id);

    if (!profile) {
      profile = await safeCreateDocument(COL_PROFILES, user.$id, {
        userId: user.$id,
        email: user.email,
        fullName: user.name || "",
        country: "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Create default wallets if none exist (best-effort)
    const wallets = await safeListDocuments(COL_WALLETS, [
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
          await safeCreateDocument(COL_WALLETS, ID.unique(), {
            userId: user.$id,
            type: w.type,
            name: w.name,
            balance: w.balance,
            currency: "USD",
            createdAt: now,
          });
        } catch {
          // ignore if permissions/collection not ready
        }
      }
    }

    return { user, profile };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to bootstrap user."));
  }
}

/* =========================================================
   DATA HELPERS (exports your pages expect)
========================================================= */
export async function getUserProfile(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");
    const p = await safeGetDocument(COL_PROFILES, id);
    if (!p) throw new Error("Profile not found.");
    return p;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load profile."));
  }
}

export async function getUserWallets(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) return [];
    return await safeListDocuments(COL_WALLETS, [
      Query.equal("userId", id),
      Query.orderAsc("type"),
      Query.limit(100),
    ]);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load wallets."));
  }
}

export async function getUserTransactions(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) return [];
    return await safeListDocuments(COL_TRANSACTIONS, [
      Query.equal("userId", id),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load transactions."));
  }
}

export async function getUserAlerts(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) return [];
    return await safeListDocuments(COL_ALERTS, [
      Query.equal("userId", id),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load notifications."));
  }
}

export async function getAffiliateAccount(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) return null;

    // Try docId=userId pattern
    const direct = await safeGetDocument(COL_AFFILIATE_ACCOUNTS, id);
    if (direct) return direct;

    // Try list pattern
    const rows = await safeListDocuments(COL_AFFILIATE_ACCOUNTS, [
      Query.equal("userId", id),
      Query.limit(1),
    ]);
    return rows[0] || null;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load affiliate account."));
  }
}

export async function getAffiliateOverview(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) return { commissionsCount: 0, totalCommission: 0 };

    const commissions = await safeListDocuments(COL_AFFILIATE_COMMISSIONS, [
      Query.equal("userId", id),
      Query.limit(200),
    ]);

    const total = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return { commissionsCount: commissions.length, totalCommission: total };
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to load affiliate overview."));
  }
}

/* =========================================================
   6-DIGIT VERIFICATION FLOW
========================================================= */
export async function createOrRefreshVerifyCode(userId) {
  try {
    const id = String(userId || "").trim();
    if (!id) throw new Error("Missing userId.");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const existing = await safeGetDocument(COL_VERIFY_CODES, id);
    if (existing) {
      await safeUpdateDocument(COL_VERIFY_CODES, id, {
        userId: id,
        code,
        used: false,
        createdAt: now,
      });
    } else {
      await safeCreateDocument(COL_VERIFY_CODES, id, {
        userId: id,
        code,
        used: false,
        createdAt: now,
      });
    }

    // Best-effort alert (so user can “see it” in Alerts)
    try {
      await safeCreateDocument(COL_ALERTS, ID.unique(), {
        userId: id,
        title: "Your access code",
        body: `Your 6-digit access code is: ${code}`,
        createdAt: now,
      });
    } catch {
      // ignore
    }

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

    const doc = await safeGetDocument(COL_VERIFY_CODES, id);
    if (!doc) throw new Error("No code found. Generate a new one.");
    if (doc.used) throw new Error("Code already used. Generate a new one.");
    if (String(doc.code) !== cleaned) throw new Error("Invalid code.");

    await safeUpdateDocument(COL_VERIFY_CODES, id, {
      used: true,
      usedAt: new Date().toISOString(),
    });

    await safeUpdateDocument(COL_PROFILES, id, {
      verificationCodeVerified: true,
      verifiedAt: new Date().toISOString(),
    });

    // Best-effort alert
    try {
      await safeCreateDocument(COL_ALERTS, ID.unique(), {
        userId: id,
        title: "Account verified",
        body: "Your account has been verified successfully.",
        createdAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return true;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Unable to verify code."));
  }
}

/* =========================================================
   LEGACY / BACKWARD-COMPAT EXPORTS (keep old pages working)
========================================================= */

// Some old pages call loginWithEmailPassword(email, pass)
export const loginWithEmailPassword = async (email, password) => signIn(email, password);

// Some old pages call registerUser({fullName,email,password,...})
export const registerUser = async (payload) => signUp(payload);

// Some old pages call logoutUser()
export const logoutUser = async () => signOut();

// Some old verify pages call resendVerificationEmail() (optional in your current flow)
export async function resendVerificationEmail() {
  // In this 6-digit system, there is no email link resend here.
  // We keep this to prevent build/import errors.
  return true;
}

// Convenience: return only user/profile from bootstrap
export async function getUserProfileFromSession() {
  const b = await ensureUserBootstrap();
  return b.profile;
}

/* =========================================================
   NAMESPACE EXPORT (helps if any file uses import * as a)
========================================================= */
export const api = {
  // core
  getErrorMessage,
  signIn,
  signUp,
  signOut,
  getCurrentUser,

  // bootstrap
  ensureUserBootstrap,
  ensureUserBootstrapWithUser,

  // data
  getUserProfile,
  getUserWallets,
  getUserTransactions,
  getUserAlerts,
  getAffiliateAccount,
  getAffiliateOverview,

  // verification
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  resendVerificationEmail,

  // legacy
  loginWithEmailPassword,
  registerUser,
  logoutUser,
};

export { ID, Query };

"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

/* =========================================
   ENV
========================================= */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Collection IDs (override if your Appwrite IDs differ)
const COL_PROFILES = process.env.NEXT_PUBLIC_COL_PROFILES || "profiles";
const COL_WALLETS = process.env.NEXT_PUBLIC_COL_WALLETS || "wallets";
const COL_TRANSACTIONS = process.env.NEXT_PUBLIC_COL_TRANSACTIONS || "transactions";
const COL_ALERTS = process.env.NEXT_PUBLIC_COL_ALERTS || "alerts";
const COL_VERIFY_CODES = process.env.NEXT_PUBLIC_COL_VERIFY_CODES || "verify_codes";
const COL_AFFILIATE_ACCOUNTS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_ACCOUNTS || "affiliate_accounts";
const COL_AFFILIATE_COMMISSIONS =
  process.env.NEXT_PUBLIC_COL_AFFILIATE_COMMISSIONS || "affiliate_commissions";

function must(name, value) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${name} is not configured.`);
  }
}

must("NEXT_PUBLIC_APPWRITE_ENDPOINT", ENDPOINT);
must("NEXT_PUBLIC_APPWRITE_PROJECT_ID", PROJECT_ID);
must("NEXT_PUBLIC_APPWRITE_DATABASE_ID", DATABASE_ID);

/* =========================================
   CLIENT
========================================= */
const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const DB_ID = DATABASE_ID;

/* =========================================
   ERROR HELPERS (always available)
========================================= */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* =========================================
   SDK-COMPAT SESSIONS
========================================= */
async function createPasswordSession(email, password) {
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

/* =========================================
   NORMALIZERS
========================================= */
function normSignIn(a, b) {
  const p = typeof a === "object" && a ? a : { email: a, password: b };
  return {
    email: String(p.email || "").trim(),
    password: String(p.password || ""),
  };
}

function normSignUp(a, b, c) {
  const p = typeof a === "object" && a ? a : { fullName: a, email: b, password: c };
  return {
    fullName: String(p.fullName || "").trim(),
    email: String(p.email || "").trim(),
    password: String(p.password || ""),
    ...p, // keep extras like referralId
  };
}

/* =========================================
   AUTH
========================================= */
export async function signUp(a, b, c) {
  try {
    const { fullName, email, password } = normSignUp(a, b, c);

    if (!fullName) throw new Error("Full name is required.");
    if (!email) throw new Error("Email is required.");
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const user = await account.create(ID.unique(), email, password, fullName);
    await createPasswordSession(email, password);
    return user;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to create account."));
  }
}

export async function signIn(a, b) {
  try {
    const { email, password } = normSignIn(a, b);
    if (!email) throw new Error("Email is required.");
    if (!password) throw new Error("Password is required.");
    return await createPasswordSession(email, password);
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to sign in."));
  }
}

export async function signOut() {
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
    // ignore; UI can still redirect
  }
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/* =========================================
   INTERNAL HELPERS (DB)
========================================= */
async function safeGetDocument(dbId, colId, docId) {
  try {
    return await db.getDocument(dbId, colId, docId);
  } catch {
    return null;
  }
}

async function safeListDocuments(dbId, colId, queries) {
  try {
    const res = await db.listDocuments(dbId, colId, queries || []);
    return res?.documents || [];
  } catch {
    return [];
  }
}

/* =========================================
   BOOTSTRAP (THIS FIXES YOUR ERROR)
   - creates/loads profile
   - creates basic wallets if missing (optional)
========================================= */
export async function ensureUserBootstrap() {
  try {
    const user = await account.get();

    // 1) profile: docId = userId
    let profile = await safeGetDocument(DB_ID, COL_PROFILES, user.$id);

    if (!profile) {
      profile = await db.createDocument(DB_ID, COL_PROFILES, user.$id, {
        userId: user.$id,
        email: user.email,
        fullName: user.name || "",
        // gates
        verificationCodeVerified: false,

        // optional fields your UI might expect
        kycStatus: "not_submitted",
        country: "",
        createdAt: new Date().toISOString(),
      });
    }

    // 2) wallets: create if none exist (won’t throw if collection missing)
    const wallets = await safeListDocuments(DB_ID, COL_WALLETS, [
      Query.equal("userId", user.$id),
      Query.limit(50),
    ]);

    if (!wallets.length) {
      // Create 3 default wallets (safe)
      const now = new Date().toISOString();
      const defaults = [
        { type: "main", name: "Main wallet", balance: 0 },
        { type: "trading", name: "Trading wallet", balance: 0 },
        { type: "affiliate", name: "Affiliate wallet", balance: 0 },
      ];

      for (const w of defaults) {
        try {
          await db.createDocument(DB_ID, COL_WALLETS, ID.unique(), {
            userId: user.$id,
            type: w.type,
            name: w.name,
            balance: w.balance,
            currency: "USD",
            createdAt: now,
          });
        } catch {
          // ignore if collection missing or permissions not set yet
        }
      }
    }

    return { user, profile };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to bootstrap user."));
  }
}

/* =========================================
   PROFILE / WALLETS / TRANSACTIONS / AFFILIATE / ALERTS
   (These keep your pages from crashing if imported)
========================================= */
export async function getUserProfile(userId) {
  try {
    const p = await db.getDocument(DB_ID, COL_PROFILES, userId);
    return p;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load profile."));
  }
}

export async function getUserWallets(userId) {
  try {
    return await safeListDocuments(DB_ID, COL_WALLETS, [
      Query.equal("userId", userId),
      Query.orderAsc("type"),
      Query.limit(100),
    ]);
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load wallets."));
  }
}

export async function getUserTransactions(userId) {
  try {
    return await safeListDocuments(DB_ID, COL_TRANSACTIONS, [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load transactions."));
  }
}

export async function getAffiliateAccount(userId) {
  try {
    // account doc might be userId or separate doc; we try both patterns
    const direct = await safeGetDocument(DB_ID, COL_AFFILIATE_ACCOUNTS, userId);
    if (direct) return direct;

    const rows = await safeListDocuments(DB_ID, COL_AFFILIATE_ACCOUNTS, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    return rows[0] || null;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load affiliate account."));
  }
}

export async function getAffiliateOverview(userId) {
  try {
    // Minimal overview: sum commissions docs if present
    const commissions = await safeListDocuments(DB_ID, COL_AFFILIATE_COMMISSIONS, [
      Query.equal("userId", userId),
      Query.limit(200),
    ]);

    const total = commissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return {
      commissionsCount: commissions.length,
      totalCommission: total,
    };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load affiliate overview."));
  }
}

export async function getUserAlerts(userId) {
  try {
    return await safeListDocuments(DB_ID, COL_ALERTS, [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load notifications."));
  }
}

/* =========================================
   6-DIGIT CODE FLOW
========================================= */
export async function createOrRefreshVerifyCode(userId) {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Upsert verify_codes doc with docId=userId
    const existing = await safeGetDocument(DB_ID, COL_VERIFY_CODES, userId);
    if (existing) {
      await db.updateDocument(DB_ID, COL_VERIFY_CODES, userId, {
        userId,
        code,
        used: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      await db.createDocument(DB_ID, COL_VERIFY_CODES, userId, {
        userId,
        code,
        used: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Add alert notification (best-effort)
    try {
      await db.createDocument(DB_ID, COL_ALERTS, ID.unique(), {
        userId,
        title: "Your access code",
        body: `Your 6-digit access code is: ${code}`,
        createdAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return { code };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to generate verification code."));
  }
}

export async function verifySixDigitCode(userId, code) {
  try {
    const cleaned = String(code || "").trim();
    if (!/^\d{6}$/.test(cleaned)) throw new Error("Code must be 6 digits.");

    const doc = await db.getDocument(DB_ID, COL_VERIFY_CODES, userId);
    if (!doc) throw new Error("No code found. Generate a new one.");

    if (doc.used) throw new Error("Code already used. Generate a new one.");
    if (String(doc.code) !== cleaned) throw new Error("Invalid code.");

    // Mark code used
    await db.updateDocument(DB_ID, COL_VERIFY_CODES, userId, {
      used: true,
      usedAt: new Date().toISOString(),
    });

    // Mark profile verified
    await db.updateDocument(DB_ID, COL_PROFILES, userId, {
      verificationCodeVerified: true,
      verifiedAt: new Date().toISOString(),
    });

    // Optional: alert
    try {
      await db.createDocument(DB_ID, COL_ALERTS, ID.unique(), {
        userId,
        title: "Account verified",
        body: "Your account has been verified successfully.",
        createdAt: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    return true;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to verify code."));
  }
}

/* =========================================
   COMPAT ALIASES (prevents “not a function”)
========================================= */
export const registerUser = async (...args) => signUp(...args);
export const loginUser = async (...args) => signIn(...args);

/* =========================================
   Re-exports
========================================= */
export { ID, Query };

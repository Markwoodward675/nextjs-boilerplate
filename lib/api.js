// lib/api.js
"use client";

import { account, databases, IDHelper, QueryHelper, DB_ID } from "./appwrite";

/**
 * Central mapping of Appwrite tables/collections.
 * These IDs must exactly match your Appwrite Database tables:
 *
 *  - user_profile
 *  - wallets
 *  - transactions
 *  - affiliate_account
 *  - affiliate_referrals
 *  - affiliate_commissions
 *  - alerts
 */
export const COLLECTIONS = {
  userProfiles: "user_profile",
  wallets: "wallets",
  transactions: "transactions",
  affiliateAccounts: "affiliate_account",
  affiliateReferrals: "affiliate_referrals",
  affiliateCommissions: "affiliate_commissions",
  alerts: "alerts",
};

/* -------------------------------------------------------------------------- */
/*  Low-level helpers                                                         */
/* -------------------------------------------------------------------------- */

function getErrorMessage(err, fallback) {
  if (!err) return fallback;
  const anyErr = /** @type {any} */ (err);
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;
  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}

/**
 * Try both old & new Appwrite email/password session APIs.
 * - Old SDK: account.createEmailSession(email, password)
 * - New Cloud SDK: account.createEmailPasswordSession({ email, password })
 */
async function createEmailSessionCompat(email, password) {
  const anyAccount = /** @type {any} */ (account);

  // Old-style name (most likely what you have)
  if (typeof anyAccount.createEmailSession === "function") {
    return anyAccount.createEmailSession(email, password);
  }

  // New-style name (object payload)
  if (typeof anyAccount.createEmailPasswordSession === "function") {
    try {
      return anyAccount.createEmailPasswordSession({ email, password });
    } catch (e) {
      // Some older new versions may expect (email, password)
      return anyAccount.createEmailPasswordSession(email, password);
    }
  }

  throw new Error(
    "Email/password login is not supported by this Appwrite SDK version."
  );
}

/**
 * Create user account in a way that works for both old & new Appwrite SDKs.
 */
async function createAccountCompat(fullName, email, password) {
  const anyAccount = /** @type {any} */ (account);

  // Newer object-style signature
  try {
    return await anyAccount.create({
      userId: IDHelper.unique(),
      email,
      password,
      name: fullName || "",
    });
  } catch (e) {
    // Fallback to classic signature: create(userId, email, password, name)
    return anyAccount.create(IDHelper.unique(), email, password, fullName || "");
  }
}

/**
 * Ensure DB ID is set before we hit databases.
 */
function ensureDbConfigured() {
  if (!DB_ID) {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

/**
 * Create default profile + three wallets (main, trading, affiliate)
 * for a new user. Safe if called multiple times.
 */
async function bootstrapUserData(user, fullName) {
  ensureDbConfigured();
  const userId = user.$id;
  const now = new Date().toISOString();

  // 1. Profile
  try {
    const existingProfiles = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.userProfiles,
      [QueryHelper.equal("userId", userId)]
    );

    if (existingProfiles.total === 0) {
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.userProfiles,
        IDHelper.unique(),
        {
          userId,
          displayName: fullName || user.name || "",
          role: "user",
          kycStatus: "not_submitted",
          avatarUrl: "",
          createdAt: now,
          updatedAt: now,
        }
      );
    }
  } catch (err) {
    console.warn("bootstrapUserData profile error (safe to ignore):", err);
  }

  // 2. Wallets
  try {
    const existingWallets = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.wallets,
      [QueryHelper.equal("userId", userId)]
    );

    if (existingWallets.total === 0) {
      const baseWallet = {
        userId,
        balance: 0,
        currency: "USD",
        status: "active",
        investmentReturnsBalance: 0,
        createdAt: now,
        updatedAt: now,
      };

      await Promise.all([
        databases.createDocument(
          DB_ID,
          COLLECTIONS.wallets,
          IDHelper.unique(),
          {
            ...baseWallet,
            type: "main",
          }
        ),
        databases.createDocument(
          DB_ID,
          COLLECTIONS.wallets,
          IDHelper.unique(),
          {
            ...baseWallet,
            type: "trading",
          }
        ),
        databases.createDocument(
          DB_ID,
          COLLECTIONS.wallets,
          IDHelper.unique(),
          {
            ...baseWallet,
            type: "affiliate",
          }
        ),
      ]);
    }
  } catch (err) {
    console.warn("bootstrapUserData wallets error (safe to ignore):", err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Auth functions (what your pages expect)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Get current logged-in user (or null if not logged in).
 * This is the function your pages are calling and currently failing on.
 */
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
}

/**
 * Register a new user with email/password and auto-create session + wallets.
 */
export async function registerUser({ fullName, email, password }) {
  try {
    const user = await createAccountCompat(fullName, email, password);
    await createEmailSessionCompat(email, password);
    await bootstrapUserData(user, fullName);
    return user;
  } catch (err) {
    console.error("registerUser error:", err);
    throw new Error(
      getErrorMessage(
        err,
        "Sign up failed. Please review your details and try again."
      )
    );
  }
}

/**
 * Login with email/password.
 */
export async function loginWithEmailPassword(email, password) {
  try {
    await createEmailSessionCompat(email, password);
    const user = await account.get();
    return user;
  } catch (err) {
    console.error("loginWithEmailPassword error:", err);
    throw new Error(
      getErrorMessage(
        err,
        "Sign in failed. Please confirm your email/password and try again."
      )
    );
  }
}

/**
 * Logout current session.
 */
export async function logoutUser() {
  try {
    await account.deleteSession("current");
  } catch (err) {
    console.error("logoutUser error:", err);
    // ignore for UI
  }
}

/* -------------------------------------------------------------------------- */
/*  Wallets / Transactions / Affiliate / Alerts                               */
/*  (names chosen to match what your pages are already calling)               */
/* -------------------------------------------------------------------------- */

export async function getUserWallets(userId) {
  ensureDbConfigured();

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.wallets,
    [QueryHelper.equal("userId", userId)]
  );

  return res.documents;
}

export async function getUserTransactions(userId, type) {
  ensureDbConfigured();

  const queries = [QueryHelper.equal("userId", userId)];
  if (type) {
    queries.push(QueryHelper.equal("type", type));
  }

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.transactions,
    queries
  );

  return res.documents;
}

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.affiliateAccounts,
    [QueryHelper.equal("userId", userId)]
  );

  return res.total > 0 ? res.documents[0] : null;
}

export async function getAffiliateOverview(userId) {
  ensureDbConfigured();

  const [referrals, commissions] = await Promise.all([
    databases.listDocuments(
      DB_ID,
      COLLECTIONS.affiliateReferrals,
      [QueryHelper.equal("affiliateUserId", userId)]
    ),
    databases.listDocuments(
      DB_ID,
      COLLECTIONS.affiliateCommissions,
      [QueryHelper.equal("affiliateUserId", userId)]
    ),
  ]);

  return {
    referrals: referrals.documents,
    commissions: commissions.documents,
  };
}

export async function getUserAlerts(userId) {
  ensureDbConfigured();

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.alerts,
    [QueryHelper.equal("userId", userId)]
  );

  return res.documents;
}

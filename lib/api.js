// lib/api.js
"use client";

import { account, databases, IDHelper, QueryHelper, DB_ID } from "./appwrite";

export const COLLECTIONS = {
  userProfiles: "user_profile",
  wallets: "wallets",
  transactions: "transactions",
  affiliateAccounts: "affiliate_account",
  affiliateReferrals: "affiliate_referrals",
  affiliateCommissions: "affiliate_commissions",
  alerts: "alerts",
};

// Make sure this matches your current production domain
const VERIFIED_REDIRECT_URL =
  "https://nextjs-boilerplate-day-traders-projects.vercel.app/verify";

/* -------------------------------------------------------------------------- */
/*  Shared error helper                                                       */
/* -------------------------------------------------------------------------- */

export function getErrorMessage(err, fallback) {
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

function ensureDbConfigured() {
  if (!DB_ID) {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

/* -------------------------------------------------------------------------- */
/*  Email/password session helpers (compat for old/new SDK)                   */
/* -------------------------------------------------------------------------- */

async function createEmailSessionCompat(email, password) {
  const anyAccount = /** @type {any} */ (account);

  if (typeof anyAccount.createEmailSession === "function") {
    return anyAccount.createEmailSession(email, password);
  }

  if (typeof anyAccount.createEmailPasswordSession === "function") {
    try {
      return anyAccount.createEmailPasswordSession({ email, password });
    } catch (e) {
      return anyAccount.createEmailPasswordSession(email, password);
    }
  }

  throw new Error(
    "Email/password login is not supported by this Appwrite SDK version."
  );
}

async function createAccountCompat(fullName, email, password) {
  const anyAccount = /** @type {any} */ (account);

  try {
    return await anyAccount.create({
      userId: IDHelper.unique(),
      email,
      password,
      name: fullName || "",
    });
  } catch (e) {
    return anyAccount.create(IDHelper.unique(), email, password, fullName || "");
  }
}

/* -------------------------------------------------------------------------- */
/*  Email verification helpers                                                */
/* -------------------------------------------------------------------------- */

export function ensureEmailVerified(user) {
  if (!user) {
    throw new Error("You must be signed in.");
  }
  const verified = user.emailVerification || user?.prefs?.emailVerification;
  if (!verified) {
    throw new Error("Please verify your email before performing this action.");
  }
}

export async function resendVerificationEmail() {
  const anyAccount = /** @type {any} */ (account);

  if (typeof anyAccount.createVerification === "function") {
    // New SDK style
    return anyAccount.createVerification({ url: VERIFIED_REDIRECT_URL });
  }

  if (typeof anyAccount.createEmailVerification === "function") {
    // Legacy SDK style
    return anyAccount.createEmailVerification(VERIFIED_REDIRECT_URL);
  }

  throw new Error(
    "This Appwrite SDK version does not support email verification."
  );
}

/* -------------------------------------------------------------------------- */
/*  Bootstrap user data (profile + wallets + signup bonus alert)              */
/* -------------------------------------------------------------------------- */

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
          email: user.email || "",
          role: "user",
          kycStatus: "not_submitted",
          avatarUrl: "",
          country: "",
          createdAt: now,
          updatedAt: now,
        }
      );
    }
  } catch (err) {
    console.warn("bootstrapUserData profile error:", err);
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
    console.warn("bootstrapUserData wallets error:", err);
  }

  // 3. Signup bonus alert (one-time)
  try {
    const existingBonusAlerts = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.alerts,
      [
        QueryHelper.equal("userId", userId),
        QueryHelper.equal("category", "signup_bonus"),
      ]
    );

    if (existingBonusAlerts.total === 0) {
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.alerts,
        IDHelper.unique(),
        {
          userId,
          title: "Claim your $100 signup bonus",
          body:
            "Welcome to Day Trader. Once you complete your first deposit and first investment or trade, you can claim a one-time $100 signup bonus.",
          category: "signup_bonus",
          status: "claimable",
          claimed: false,
          bonusAmount: 100,
          createdAt: now,
          updatedAt: now,
        }
      );
    }
  } catch (err) {
    console.warn("bootstrapUserData bonus alert error:", err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Public auth API                                                           */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
}

/**
 * Register a new user.
 * NOTE: Does NOT auto-login. Caller should show
 * "Account created. Please sign in with your email and password."
 */
export async function registerUser({ fullName, email, password }) {
  try {
    // 1) Create the user account
    const user = await createAccountCompat(fullName, email, password);

    // 2) Do NOT auto login. Always require explicit sign in.
    const autoLoginSucceeded = false;

    // 3) Best-effort bootstrap of profile + wallets + signup bonus
    try {
      await bootstrapUserData(user, fullName);
    } catch (bootErr) {
      console.warn("bootstrapUserData after signup failed:", bootErr);
    }

    return { user, autoLoginSucceeded };
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
 * Always clears any old session first so you don't "stick" to another account.
 */
export async function loginWithEmailPassword(email, password) {
  try {
    // 1) Always clear any existing session so we don't "stick" to another account
    try {
      await account.deleteSession("current");
    } catch (e) {
      console.warn("No existing session to delete before login:", e);
    }

    // 2) Try to create a new email/password session
    try {
      await createEmailSessionCompat(email, password);
    } catch (err) {
      console.error("createEmailSessionCompat error:", err);
      const msg = getErrorMessage(
        err,
        "Sign in failed. Please confirm your email/password and try again."
      );
      const lower = (msg || "").toLowerCase();

      if (
        typeof msg === "string" &&
        (lower.includes("network request failed") ||
          lower.includes("failed to fetch"))
      ) {
        throw new Error(
          "Unable to reach Day Trader servers. Please check your connection or try again in a moment."
        );
      }

      throw new Error(msg);
    }

    // 3) Return fresh user
    const user = await account.get();
    return user;
  } catch (err) {
    console.error("loginWithEmailPassword error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      "Sign in failed. Please confirm your email/password and try again."
    );
  }
}

export async function logoutUser() {
  try {
    await account.deleteSession("current");
  } catch (err) {
    console.error("logoutUser error:", err);
  }
}

/* -------------------------------------------------------------------------- */
/*  Wallets / transactions / affiliate / alerts                               */
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

/* -------------------------------------------------------------------------- */
/*  Signup bonus claim                                                        */
/* -------------------------------------------------------------------------- */

export async function claimSignupBonus(userId, alertId) {
  ensureDbConfigured();
  const now = new Date().toISOString();

  // 1. Verify session and identity
  const current = await account.get().catch(() => null);
  if (!current) {
    throw new Error("You must be signed in to claim the signup bonus.");
  }
  if (current.$id !== userId) {
    throw new Error("You can only claim bonuses for your own account.");
  }
  ensureEmailVerified(current);

  // 2. Load alert
  const alertDoc = await databases.getDocument(
    DB_ID,
    COLLECTIONS.alerts,
    alertId
  );

  if (!alertDoc || alertDoc.userId !== userId) {
    throw new Error("Bonus alert not found.");
  }
  if (alertDoc.claimed || alertDoc.status === "claimed") {
    throw new Error("Signup bonus has already been claimed.");
  }

  const bonusAmount = alertDoc.bonusAmount || 100;

  // 3. Check that user has at least one completed deposit and invest/trade
  const txRes = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.transactions,
    [QueryHelper.equal("userId", userId)]
  );
  const txs = txRes.documents || [];

  const hasDeposit = txs.some(
    (t) => t.type === "deposit" && (t.status || "completed") === "completed"
  );
  const hasInvestOrTrade = txs.some(
    (t) =>
      (t.type === "invest" || t.type === "trade") &&
      (t.status || "completed") === "completed"
  );

  if (!hasDeposit || !hasInvestOrTrade) {
    throw new Error(
      "Signup bonus can only be claimed after your first completed deposit and first completed investment or trade."
    );
  }

  // 4. Credit main wallet
  const walletsRes = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.wallets,
    [QueryHelper.equal("userId", userId)]
  );
  const mainWallet = walletsRes.documents.find((w) => w.type === "main");
  if (!mainWallet) {
    throw new Error("Main wallet not found.");
  }

  const newBalance = (mainWallet.balance || 0) + bonusAmount;

  await databases.updateDocument(
    DB_ID,
    COLLECTIONS.wallets,
    mainWallet.$id,
    {
      balance: newBalance,
      updatedAt: now,
    }
  );

  // 5. Mark alert as claimed
  await databases.updateDocument(DB_ID, COLLECTIONS.alerts, alertDoc.$id, {
    claimed: true,
    status: "claimed",
    updatedAt: now,
  });

  // 6. Optional: record bonus transaction
  try {
    await databases.createDocument(
      DB_ID,
      COLLECTIONS.transactions,
      IDHelper.unique(),
      {
        userId,
        type: "bonus",
        amount: bonusAmount,
        currency: "USD",
        status: "completed",
        meta: "Signup bonus credit",
        createdAt: now,
        updatedAt: now,
      }
    );
  } catch (err) {
    console.warn("Failed to record bonus transaction:", err);
  }

  return { success: true, newBalance };
}

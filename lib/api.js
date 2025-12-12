// lib/api.js
"use client";

import {
  account,
  databases,
  functions,
  DB_ID,
  USERS_COLLECTION_ID,
  WALLETS_COLLECTION_ID,
  TRANSACTIONS_COLLECTION_ID,
  ALERTS_COLLECTION_ID,
  AFFILIATE_ACCOUNTS_COLLECTION_ID,
  AFFILIATE_REFERRALS_COLLECTION_ID,
  AFFILIATE_COMMISSIONS_COLLECTION_ID,
  IDHelper,
  QueryHelper,
  Permission,
  Role,
} from "./appwrite";

/* -------------------------------------------------------------------------- */
/*  Collections                                                               */
/* -------------------------------------------------------------------------- */

export const COLLECTIONS = {
  userProfiles: USERS_COLLECTION_ID, // "user_profile"
  wallets: WALLETS_COLLECTION_ID, // "wallets"
  transactions: TRANSACTIONS_COLLECTION_ID, // "transactions"
  affiliateAccounts: AFFILIATE_ACCOUNTS_COLLECTION_ID, // "affiliate_account"
  affiliateReferrals: AFFILIATE_REFERRALS_COLLECTION_ID, // "affiliate_referrals"
  affiliateCommissions: AFFILIATE_COMMISSIONS_COLLECTION_ID, // "affiliate_commissions"
  alerts: ALERTS_COLLECTION_ID, // "alerts"
};

/* -------------------------------------------------------------------------- */
/*  Config + Errors                                                           */
/* -------------------------------------------------------------------------- */

export function getErrorMessage(err, fallback) {
  if (!err) return fallback;
  const anyErr = err;
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;
  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}

function ensureDbConfigured() {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

/* -------------------------------------------------------------------------- */
/*  SDK compat helpers                                                        */
/* -------------------------------------------------------------------------- */

async function createEmailSessionCompat(email, password) {
  const anyAccount = account;

  // Legacy SDK
  if (typeof anyAccount.createEmailSession === "function") {
    return anyAccount.createEmailSession(email, password);
  }

  // New SDK
  if (typeof anyAccount.createEmailPasswordSession === "function") {
    try {
      return anyAccount.createEmailPasswordSession({ email, password });
    } catch {
      return anyAccount.createEmailPasswordSession(email, password);
    }
  }

  throw new Error("Email/password login is not supported by this Appwrite SDK.");
}

async function createAccountCompat(fullName, email, password) {
  const anyAccount = account;

  // Try new object style first
  if (typeof anyAccount.create === "function") {
    try {
      return await anyAccount.create({
        userId: IDHelper.unique(),
        email,
        password,
        name: fullName || "",
      });
    } catch {
      // fallback positional
      return await anyAccount.create(IDHelper.unique(), email, password, fullName || "");
    }
  }

  throw new Error("Account.create is not available in this Appwrite SDK.");
}

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function logoutUser() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------------------- */
/*  PROFILE "BOOTSTRAP" (NO separate file; lives here)                        */
/*  ✅ Profile document ID = user.$id                                         */
/* -------------------------------------------------------------------------- */

export async function getUserProfile(userId) {
  ensureDbConfigured();
  try {
    // ✅ direct get by documentId = userId
    return await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, userId);
  } catch {
    return null;
  }
}

async function createUserProfileIfMissing(user) {
  ensureDbConfigured();
  const userId = user.$id;
  const now = new Date().toISOString();

  const existing = await getUserProfile(userId);
  if (existing) return existing;

  // ✅ Create profile with documentId = userId
  const data = {
    userId,
    displayName: user.name || "",
    email: user.email || "",
    role: "user",
    kycStatus: "not_submitted",

    // 6-digit gate fields
    verificationCode: "",
    verificationCodeExpiresAt: "",
    verificationCodeVerified: false,

    createdAt: now,
    updatedAt: now,
  };

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    userId, // ✅ documentId = userId
    data,
    perms
  );
}

async function ensureWallets(userId) {
  ensureDbConfigured();
  const now = new Date().toISOString();

  // If no wallets exist, create main/trading/affiliate
  const list = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
  ]);

  if ((list?.documents || []).length > 0) return list.documents;

  const base = {
    userId,
    balance: 0,
    currency: "USD",
    status: "active",
    investmentReturnsBalance: 0,
    createdAt: now,
    updatedAt: now,
  };

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  const created = await Promise.all([
    databases.createDocument(DB_ID, COLLECTIONS.wallets, IDHelper.unique(), { ...base, type: "main" }, perms),
    databases.createDocument(DB_ID, COLLECTIONS.wallets, IDHelper.unique(), { ...base, type: "trading" }, perms),
    databases.createDocument(DB_ID, COLLECTIONS.wallets, IDHelper.unique(), { ...base, type: "affiliate" }, perms),
  ]);

  return created;
}

async function ensureSignupBonusAlert(userId) {
  ensureDbConfigured();
  const now = new Date().toISOString();

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
  ]);

  if ((res?.documents || []).length > 0) return res.documents[0];

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
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
    },
    perms
  );
}

/**
 * Call this after signup AND after first login so the DB is always ready.
 */
export async function ensureUserBootstrap(user) {
  const profile = await createUserProfileIfMissing(user);
  await ensureWallets(user.$id);
  await ensureSignupBonusAlert(user.$id);
  return profile;
}

/* -------------------------------------------------------------------------- */
/*  Signup / Login                                                             */
/* -------------------------------------------------------------------------- */

export async function registerUser({ fullName, email, password }) {
  try {
    // Create account (auth)
    const newUser = await createAccountCompat(fullName, email, password);

    // NOTE: we do NOT auto-login here (keeps behavior simple)
    // But we can still bootstrap with the returned user object:
    try {
      await ensureUserBootstrap(newUser);
    } catch (e) {
      console.warn("Bootstrap after signup failed:", e);
    }

    return { user: newUser };
  } catch (err) {
    throw new Error(
      getErrorMessage(err, "Sign up failed. Please check your details and try again.")
    );
  }
}

export async function loginWithEmailPassword(email, password) {
  try {
    // Clear conflicting session (optional but helpful)
    try {
      const existing = await account.get();
      if (existing && existing.email !== email) {
        await account.deleteSession("current");
      }
    } catch {}

    await createEmailSessionCompat(email, password);

    // Now get user
    const user = await account.get();

    // Bootstrap on login (ensures profile/wallets exist)
    try {
      await ensureUserBootstrap(user);
    } catch (e) {
      console.warn("Bootstrap after login failed:", e);
    }

    return user;
  } catch (err) {
    const msg = getErrorMessage(
      err,
      "Sign in failed. Please confirm your email/password and try again."
    );

    const lower = String(msg || "").toLowerCase();
    if (lower.includes("network request failed") || lower.includes("failed to fetch")) {
      throw new Error("Unable to reach Day Trader servers. Please check your connection and try again.");
    }

    throw new Error(msg);
  }
}

/* -------------------------------------------------------------------------- */
/*  OPTIONAL email-link verification (not the main gate)                      */
/* -------------------------------------------------------------------------- */

export async function resendVerificationEmail() {
  const redirectUrl =
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_REDIRECT_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/verify`
      : "");

  const anyAccount = account;

  if (typeof anyAccount.createVerification === "function") {
    return anyAccount.createVerification({ url: redirectUrl });
  }
  if (typeof anyAccount.createEmailVerification === "function") {
    return anyAccount.createEmailVerification(redirectUrl);
  }

  throw new Error("This Appwrite SDK version does not support email verification.");
}

/* -------------------------------------------------------------------------- */
/*  6-DIGIT CODE: MAIN VERIFICATION GATE                                      */
/*  Option A (DEV): generate in browser (NOT recommended for production)      */
/*  Option B (PROD): call Appwrite Function to email code                     */
/* -------------------------------------------------------------------------- */

export async function requestVerificationCode() {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in to request a code.");

  // ✅ Preferred: call Appwrite Function (emails the code)
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_SEND_CODE_FUNCTION_ID;
  if (functionId && functionId.trim() !== "") {
    const exec = await functions.createExecution(
      functionId,
      JSON.stringify({ userId: current.$id, email: current.email }),
      false
    );

    const raw = exec?.responseBody;
    const payload = typeof raw === "string" ? safeJsonParse(raw) : raw;

    if (!payload?.ok) {
      throw new Error(payload?.message || "Failed to send verification code.");
    }

    return payload; // { ok:true, expiresAt }
  }

  // DEV fallback: generate + store code in profile (shows no email)
  const profile = await createUserProfileIfMissing(current);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCode: code,
    verificationCodeExpiresAt: expiresAt,
    verificationCodeVerified: false,
    updatedAt: new Date().toISOString(),
  });

  // DEV: return code so you can display it (remove in production)
  return { ok: true, expiresAt, devCode: code };
}

export async function confirmVerificationCode(inputCode) {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in to verify your code.");

  const profile = await createUserProfileIfMissing(current);

  if (!profile.verificationCode || !profile.verificationCodeExpiresAt) {
    throw new Error("No active code. Please request a new one.");
  }

  const now = new Date();
  const expires = new Date(profile.verificationCodeExpiresAt);

  if (expires < now) {
    throw new Error("This code has expired. Please request a new one.");
  }

  if (String(profile.verificationCode) !== String(inputCode)) {
    throw new Error("The code you entered is incorrect.");
  }

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCodeVerified: true,
    verificationCode: "",
    updatedAt: now.toISOString(),
  });

  return { success: true };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, message: "Invalid function response." };
  }
}

/* -------------------------------------------------------------------------- */
/*  Data fetch helpers used by dashboard                                      */
/* -------------------------------------------------------------------------- */

export async function getUserWallets(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
  ]);
  return res.documents || [];
}

export async function getUserTransactions(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.transactions, [
    QueryHelper.equal("userId", userId),
  ]);
  return res.documents || [];
}

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
    QueryHelper.equal("userId", userId),
  ]);
  return res.total > 0 ? res.documents[0] : null;
}

export async function getAffiliateOverview(userId) {
  ensureDbConfigured();
  const [referrals, commissions] = await Promise.all([
    databases.listDocuments(DB_ID, COLLECTIONS.affiliateReferrals, [
      QueryHelper.equal("affiliateUserId", userId),
    ]),
    databases.listDocuments(DB_ID, COLLECTIONS.affiliateCommissions, [
      QueryHelper.equal("affiliateUserId", userId),
    ]),
  ]);

  return {
    referrals: referrals.documents || [],
    commissions: commissions.documents || [],
  };
}

export async function getUserAlerts(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
  ]);
  return res.documents || [];
}
<<<<<<< HEAD
// One-time signup bonus claim
export async function claimSignupBonus() {
=======

/* -------------------------------------------------------------------------- */
/*  Signup bonus                                                              */
/* -------------------------------------------------------------------------- */

// One-time signup bonus claim (updates the signup_bonus alert to claimed)
async function claimSignupBonusImpl() {
>>>>>>> 6ff8f4f (feat: export claimSignupBonus)
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in.");

  const userId = current.$id;

<<<<<<< HEAD
  // Find the bonus alert
=======
  // Find the signup bonus alert
>>>>>>> 6ff8f4f (feat: export claimSignupBonus)
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
  ]);

  if (!res.documents || res.documents.length === 0) {
    throw new Error("Signup bonus not found.");
  }

  const bonus = res.documents[0];

  // Prevent double-claim
  if (bonus.claimed === true || bonus.status === "claimed") {
    throw new Error("Bonus already claimed.");
  }

<<<<<<< HEAD
  // Mark as claimed (do NOT credit withdrawable wallet here)
  const now = new Date().toISOString();

  const updated = await databases.updateDocument(
    DB_ID,
    COLLECTIONS.alerts,
    bonus.$id,
    {
      claimed: true,
      status: "claimed",
      claimedAt: now,
      updatedAt: now,
    }
  );

  return updated;
=======
  const now = new Date().toISOString();

  return await databases.updateDocument(DB_ID, COLLECTIONS.alerts, bonus.$id, {
    claimed: true,
    status: "claimed",
    claimedAt: now,
    updatedAt: now,
  });
}

// Export it with the exact name your page imports
export async function claimSignupBonus() {
  return claimSignupBonusImpl();
>>>>>>> 6ff8f4f (feat: export claimSignupBonus)
}

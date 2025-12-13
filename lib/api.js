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
  userProfiles: USERS_COLLECTION_ID || "user_profile",
  wallets: WALLETS_COLLECTION_ID || "wallets",
  transactions: TRANSACTIONS_COLLECTION_ID || "transactions",
  alerts: ALERTS_COLLECTION_ID || "alerts",
  affiliateAccounts: AFFILIATE_ACCOUNTS_COLLECTION_ID || "affiliate_account",
  affiliateReferrals: AFFILIATE_REFERRALS_COLLECTION_ID || "affiliate_referrals",
  affiliateCommissions:
    AFFILIATE_COMMISSIONS_COLLECTION_ID || "affiliate_commissions",
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export function getErrorMessage(err, fallback = "Something went wrong.") {
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
  if (!DB_ID || String(DB_ID).trim() === "") {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Appwrite Account SDK compatibility                                        */
/* -------------------------------------------------------------------------- */

async function createEmailSessionCompat(email, password) {
  const anyAccount = account;

  // Older SDK
  if (typeof anyAccount.createEmailSession === "function") {
    return anyAccount.createEmailSession(email, password);
  }

  // Newer SDK
  if (typeof anyAccount.createEmailPasswordSession === "function") {
    try {
      return anyAccount.createEmailPasswordSession({ email, password });
    } catch {
      return anyAccount.createEmailPasswordSession(email, password);
    }
  }

  throw new Error("Email/password session method not found in this SDK.");
}

async function createAccountCompat(fullName, email, password) {
  const anyAccount = account;

  if (typeof anyAccount.create !== "function") {
    throw new Error("Account.create is not available in this Appwrite SDK.");
  }

  // Try object style, fallback to positional
  try {
    return await anyAccount.create({
      userId: IDHelper.unique(),
      email,
      password,
      name: fullName || "",
    });
  } catch {
    return await anyAccount.create(
      IDHelper.unique(),
      email,
      password,
      fullName || ""
    );
  }
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
/*  Profile bootstrap (NO separate file)                                      */
/*  ✅ profile documentId = user.$id                                          */
/* -------------------------------------------------------------------------- */

export async function getUserProfile(userId) {
  ensureDbConfigured();
  try {
    return await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, userId);
  } catch {
    return null;
  }
}

async function createUserProfileIfMissing(user) {
  ensureDbConfigured();
  const userId = user.$id;

  const existing = await getUserProfile(userId);
  if (existing) return existing;

  const now = new Date().toISOString();

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

  // ✅ doc ID equals userId (important for Appwrite Function getDocument)
  return await databases.createDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    userId,
    data,
    perms
  );
}

async function ensureWallets(userId) {
  ensureDbConfigured();
  const now = new Date().toISOString();

  const list = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
  ]);

  if ((list?.documents || []).length > 0) return list.documents;

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  const base = {
    userId,
    balance: 0,
    currency: "USD",
    status: "active",
    investmentReturnsBalance: 0,
    createdAt: now,
    updatedAt: now,
  };

  const created = await Promise.all([
    databases.createDocument(
      DB_ID,
      COLLECTIONS.wallets,
      IDHelper.unique(),
      { ...base, type: "main" },
      perms
    ),
    databases.createDocument(
      DB_ID,
      COLLECTIONS.wallets,
      IDHelper.unique(),
      { ...base, type: "trading" },
      perms
    ),
    databases.createDocument(
      DB_ID,
      COLLECTIONS.wallets,
      IDHelper.unique(),
      { ...base, type: "affiliate" },
      perms
    ),
  ]);

  return created;
}

async function ensureSignupBonusAlert(userId) {
  ensureDbConfigured();
  const now = new Date().toISOString();

  const existing = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
  ]);

  if ((existing?.documents || []).length > 0) return existing.documents[0];

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
        "Welcome to Day Trader. This is a one-time educational bonus. It becomes usable only after your first deposit and your first trade/invest action.",
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

export async function ensureUserBootstrap(user) {
  const profile = await createUserProfileIfMissing(user);
  await ensureWallets(user.$id);
  await ensureSignupBonusAlert(user.$id);
  return profile;
}

/* -------------------------------------------------------------------------- */
/*  Signup / Signin                                                           */
/* -------------------------------------------------------------------------- */

export async function registerUser({ fullName, email, password }) {
  try {
    const created = await createAccountCompat(fullName, email, password);

    // Bootstrap immediately (safe even if user isn't logged in yet)
    try {
      await ensureUserBootstrap(created);
    } catch (e) {
      console.warn("[Bootstrap after signup failed]", e);
    }

    return { user: created };
  } catch (err) {
    throw new Error(
      getErrorMessage(err, "Sign up failed. Please check your details and try again.")
    );
  }
}

export async function loginWithEmailPassword(email, password) {
  try {
    // Avoid "wrong user session" surprises
    try {
      const existing = await account.get();
      if (existing?.email && existing.email !== email) {
        await account.deleteSession("current");
      }
    } catch {}

    await createEmailSessionCompat(email, password);
    const user = await account.get();

    // Bootstrap on login
    try {
      await ensureUserBootstrap(user);
    } catch (e) {
      console.warn("[Bootstrap after login failed]", e);
    }

    return user;
  } catch (err) {
    const msg = getErrorMessage(
      err,
      "Sign in failed. Please confirm your email/password and try again."
    );
    const lower = String(msg).toLowerCase();
    if (lower.includes("network request failed") || lower.includes("failed to fetch")) {
      throw new Error("Network request failed. Please check your internet and try again.");
    }
    throw new Error(msg);
  }
}

/* -------------------------------------------------------------------------- */
/*  Optional email-link verification (NOT the main gate)                       */
/* -------------------------------------------------------------------------- */

export async function resendVerificationEmail() {
  const redirectUrl =
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_REDIRECT_URL ||
    (typeof window !== "undefined" ? `${window.location.origin}/verify` : "");

  const anyAccount = account;

  // Newer SDK
  if (typeof anyAccount.createVerification === "function") {
    try {
      return await anyAccount.createVerification({ url: redirectUrl });
    } catch {
      return await anyAccount.createVerification(redirectUrl);
    }
  }

  // Older SDK variants
  if (typeof anyAccount.createEmailVerification === "function") {
    return await anyAccount.createEmailVerification(redirectUrl);
  }

  throw new Error("Email verification is not supported by this Appwrite SDK.");
}

/* -------------------------------------------------------------------------- */
/*  6-digit code verification (MAIN gate)                                     */
/*  Uses Appwrite Function if env is set; otherwise DEV fallback               */
/* -------------------------------------------------------------------------- */

export async function requestVerificationCode() {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in to request a code.");

  // ✅ Production: call Appwrite Function to email the code
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_SEND_CODE_FUNCTION_ID;
  if (functionId && functionId.trim() !== "") {
    const exec = await functions.createExecution(
      functionId,
      JSON.stringify({ userId: current.$id, email: current.email }),
      false
    );

    const payload =
      typeof exec?.responseBody === "string"
        ? safeJsonParse(exec.responseBody)
        : exec?.responseBody;

    if (!payload?.ok) {
      throw new Error(payload?.message || "Failed to send verification code.");
    }

    return payload; // { ok:true, expiresAt }
  }

  // DEV fallback: generate/store code directly (no email)
  await createUserProfileIfMissing(current);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCode: code,
    verificationCodeExpiresAt: expiresAt,
    verificationCodeVerified: false,
    updatedAt: new Date().toISOString(),
  });

  // DEV: return the code so you can show it on screen if needed
  return { ok: true, expiresAt, devCode: code };
}

export async function confirmVerificationCode(inputCode) {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in to verify your code.");

  const profile = await createUserProfileIfMissing(current);

  if (!profile?.verificationCode || !profile?.verificationCodeExpiresAt) {
    throw new Error("No active verification code. Please request a new one.");
  }

  const now = new Date();
  const exp = new Date(profile.verificationCodeExpiresAt);

  if (exp < now) throw new Error("This code has expired. Please request a new one.");
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

/* -------------------------------------------------------------------------- */
/*  Dashboard data loaders                                                     */
/* -------------------------------------------------------------------------- */

export async function getUserWallets(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
  ]);
  return res?.documents || [];
}

export async function getUserTransactions(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.transactions, [
    QueryHelper.equal("userId", userId),
  ]);
  return res?.documents || [];
}

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
    QueryHelper.equal("userId", userId),
  ]);
  return res?.total > 0 ? res.documents[0] : null;
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
    referrals: referrals?.documents || [],
    commissions: commissions?.documents || [],
  };
}

export async function getUserAlerts(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
  ]);
  return res?.documents || [];
}

/* -------------------------------------------------------------------------- */
/*  Signup bonus claim                                                         */
/* -------------------------------------------------------------------------- */

export async function claimSignupBonus() {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in.");

  const userId = current.$id;

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
  ]);

  if (!res?.documents || res.documents.length === 0) {
    throw new Error("Signup bonus not found.");
  }

  const bonus = res.documents[0];

  if (bonus.claimed === true || bonus.status === "claimed") {
    throw new Error("Bonus already claimed.");
  }

  const now = new Date().toISOString();

  return await databases.updateDocument(DB_ID, COLLECTIONS.alerts, bonus.$id, {
    claimed: true,
    status: "claimed",
    claimedAt: now,
    updatedAt: now,
  });
}

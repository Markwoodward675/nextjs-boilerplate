// lib/api.js
"use client";

import {
  account,
  databases,
  functions,
  DB_ID,
  IDHelper,
  QueryHelper,
  Permission,
  Role,
} from "./appwrite";

/* -------------------------------------------------------------------------- */
/* Collections (match your Appwrite table IDs)                                 */
/* -------------------------------------------------------------------------- */

export const COLLECTIONS = {
  userProfiles: "user_profile",
  wallets: "wallets",
  transactions: "transactions",
  alerts: "alerts",
  affiliateAccounts: "affiliate_account",
  affiliateReferrals: "affiliate_referrals",
  affiliateCommissions: "affiliate_commissions",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
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
  if (!DB_ID || String(DB_ID).trim() === "") {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Appwrite SDK compat                                                         */
/* -------------------------------------------------------------------------- */

async function createEmailSessionCompat(email, password) {
  const anyAccount = account;

  if (typeof anyAccount.createEmailSession === "function") {
    return anyAccount.createEmailSession(email, password);
  }

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

  if (typeof anyAccount.create === "function") {
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

  throw new Error("Account.create is not available in this Appwrite SDK.");
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
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

export async function registerUser({ fullName, email, password }) {
  const newUser = await createAccountCompat(fullName, email, password);

  // best-effort bootstrap
  try {
    await ensureUserBootstrap(newUser);
  } catch (e) {
    console.warn("Bootstrap after signup failed:", e);
  }

  return { user: newUser };
}

export async function loginWithEmailPassword(email, password) {
  // Optional: clear session if different user is logged in
  try {
    const existing = await account.get();
    if (existing && existing.email && existing.email !== email) {
      await account.deleteSession("current");
    }
  } catch {}

  await createEmailSessionCompat(email, password);

  const user = await account.get();

  // best-effort bootstrap
  try {
    await ensureUserBootstrap(user);
  } catch (e) {
    console.warn("Bootstrap after login failed:", e);
  }

  return user;
}

/* -------------------------------------------------------------------------- */
/* Profile + Bootstrap (docId = user.$id)                                      */
/* -------------------------------------------------------------------------- */

export async function getUserProfile(userId) {
  ensureDbConfigured();
  return await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, userId);
}

function makeUsername(user) {
  const emailPrefix =
    (user?.email || "")
      .split("@")[0]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "user";

  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${emailPrefix}-${suffix}`;
}

async function createUserProfileIfMissing(user) {
  ensureDbConfigured();

  const userId = user?.$id;
  if (!userId) throw new Error("Missing user.$id");

  // Try to read first
  try {
    return await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, userId);
  } catch {
    // create below
  }

  const nowIso = new Date().toISOString();

  // IMPORTANT: keys here must match your user_profile columns exactly
  const profileData = {
    userId, // string
    username: makeUsername(user),
    fullName: user?.name || "",
    email: user?.email || "",
    role: "user",
    kycStatus: "not_submitted",

    // 6-digit verification fields (boolean)
    verificationCode: "",
    verificationCodeExpiresAt: null, // datetime
    verificationCodeVerified: false, // ✅ boolean

    // Optional columns (safe, because they exist in your schema)
    displayName: user?.name || "",

    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    userId, // docId = user.$id
    profileData,
    perms
  );
}

async function ensureWallets(userId) {
  ensureDbConfigured();
  const nowIso = new Date().toISOString();

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);

  if ((res?.documents || []).length > 0) return res.documents;

  const baseWallet = {
    userId,
    balance: 0,
    currency: "USD",
    status: "active",
    investmentReturnsBalance: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await Promise.all([
    databases.createDocument(
      DB_ID,
      COLLECTIONS.wallets,
      IDHelper.unique(),
      { ...baseWallet, type: "main" },
      perms
    ),
    databases.createDocument(
      DB_ID,
      COLLECTIONS.wallets,
      IDHelper.unique(),
      { ...baseWallet, type: "trading" },
      perms
    ),
    databases.createDocument(
      DB_ID,
      COLLECTIONS.wallets,
      IDHelper.unique(),
      { ...baseWallet, type: "affiliate" },
      perms
    ),
  ]);
}

async function ensureSignupBonusAlert(userId) {
  ensureDbConfigured();
  const nowIso = new Date().toISOString();

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
    QueryHelper.limit(1),
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
      createdAt: nowIso,
      updatedAt: nowIso,
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
/* 6-digit verification (MAIN gate)                                            */
/* -------------------------------------------------------------------------- */

export async function requestVerificationCode() {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in to request a code.");

  // Ensure profile exists first
  await createUserProfileIfMissing(current);

  // Preferred: Appwrite Function (production email)
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

  // DEV fallback: generate + store in profile
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAtIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCode: code,
    verificationCodeExpiresAt: expiresAtIso, // datetime ISO
    verificationCodeVerified: false, // ✅ boolean
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, expiresAt: expiresAtIso, devCode: code };
}

export async function confirmVerificationCode(inputCode) {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in.");

  const profile = await databases.getDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    current.$id
  );

  const stored = String(profile?.verificationCode || "");
  const expiresAt = profile?.verificationCodeExpiresAt || null;

  const verified = Boolean(profile?.verificationCodeVerified);
  if (verified) return { ok: true };

  if (!stored || stored.length !== 6) {
    throw new Error("No verification code found. Please generate a new one.");
  }

  if (!expiresAt) {
    throw new Error("Verification code is missing expiry. Generate a new code.");
  }

  const nowMs = Date.now();
  const expMs = new Date(expiresAt).getTime();
  if (Number.isFinite(expMs) && nowMs > expMs) {
    throw new Error("Verification code expired. Please generate a new code.");
  }

  if (String(inputCode || "").trim() !== stored) {
    throw new Error("Invalid code. Please try again.");
  }

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCodeVerified: true, // ✅ boolean
    verificationCode: "",
    verificationCodeExpiresAt: null,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Reads for dashboard                                                         */
/* -------------------------------------------------------------------------- */

export async function getUserWallets(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res.documents || [];
}

export async function getUserTransactions(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.transactions, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(100),
  ]);
  return res.documents || [];
}

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(1),
  ]);
  return res.total > 0 ? res.documents[0] : null;
}

export async function getAffiliateOverview(userId) {
  ensureDbConfigured();

  const [referrals, commissions] = await Promise.all([
    databases.listDocuments(DB_ID, COLLECTIONS.affiliateReferrals, [
      QueryHelper.equal("affiliateUserId", userId),
      QueryHelper.limit(200),
    ]),
    databases.listDocuments(DB_ID, COLLECTIONS.affiliateCommissions, [
      QueryHelper.equal("affiliateUserId", userId),
      QueryHelper.limit(200),
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
    QueryHelper.limit(100),
  ]);
  return res.documents || [];
}

/* -------------------------------------------------------------------------- */
/* Signup bonus claim                                                          */
/* -------------------------------------------------------------------------- */

export async function claimSignupBonus() {
  ensureDbConfigured();

  const current = await account.get().catch(() => null);
  if (!current) throw new Error("You must be signed in.");

  const userId = current.$id;

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
    QueryHelper.limit(1),
  ]);

  if (!res.documents || res.documents.length === 0) {
    throw new Error("Signup bonus not found.");
  }

  const bonus = res.documents[0];

  if (bonus.claimed === true || bonus.status === "claimed") {
    throw new Error("Bonus already claimed.");
  }

  const nowIso = new Date().toISOString();

  return await databases.updateDocument(DB_ID, COLLECTIONS.alerts, bonus.$id, {
    claimed: true,
    status: "claimed",
    claimedAt: nowIso,
    updatedAt: nowIso,
  });
}

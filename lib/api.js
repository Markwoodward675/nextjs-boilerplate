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
/* Collections                                                                 */
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

export function getErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;

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

function nowIso() {
  return new Date().toISOString();
}

// 36-char UUID (fits your wallets walletId size 36)
function uuid36() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function makeUsername(user) {
  const emailPrefix =
    (user?.email || "")
      .split("@")[0]
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "user";
  return `${emailPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// 6-digit int affiliateId that fits your Min/Max patterns
function newAffiliateIdInt() {
  return Math.floor(100000 + Math.random() * 900000); // 100000..999999
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
      return await anyAccount.create(IDHelper.unique(), email, password, fullName || "");
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
  } catch {}
}

export async function registerUser({ fullName, email, password }) {
  const user = await createAccountCompat(fullName, email, password);

  // optional email-link verification (fallback)
  try {
    await resendVerificationEmail();
  } catch {}

  try {
    await ensureUserBootstrap(user);
  } catch (e) {
    console.warn("Bootstrap after signup failed:", e);
  }

  return { user };
}

export async function loginWithEmailPassword(email, password) {
  try {
    const existing = await account.get();
    if (existing?.email && existing.email !== email) {
      await account.deleteSession("current");
    }
  } catch {}

  await createEmailSessionCompat(email, password);
  const user = await account.get();

  try {
    await ensureUserBootstrap(user);
  } catch (e) {
    console.warn("Bootstrap after login failed:", e);
  }

  return user;
}

/**
 * OPTIONAL email-link verification (NOT the main gate anymore)
 */
export async function resendVerificationEmail(redirectUrl) {
  const url =
    redirectUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/verify`
      : "https://example.com/verify");

  return await account.createVerification(url);
}

/* -------------------------------------------------------------------------- */
/* Profile (docId = user.$id)                                                  */
/* -------------------------------------------------------------------------- */

export async function getUserProfile(userId) {
  ensureDbConfigured();

  let id = userId;
  if (!id) {
    const u = await getCurrentUser();
    if (!u?.$id) throw new Error("You must be signed in.");
    id = u.$id;
  }

  return await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, id);
}

async function createUserProfileIfMissing(user) {
  ensureDbConfigured();
  const userId = user?.$id;
  if (!userId) throw new Error("Missing user.$id");

  try {
    return await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, userId);
  } catch {}

  const t = nowIso();

  const profileData = {
    userId,
    username: makeUsername(user),
    fullName: user?.name || "",
    email: user?.email || "",

    role: "user",
    kycStatus: "not_submitted",

    verificationCode: "",
    verificationCodeExpiresAt: null,
    verificationCodeVerified: false, // ✅ boolean

    displayName: user?.name || "",

    createdAt: t,
    updatedAt: t,
  };

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    userId,
    profileData,
    perms
  );
}

/* -------------------------------------------------------------------------- */
/* Wallets (matches your wallets schema exactly)                               */
/* -------------------------------------------------------------------------- */

async function ensureWallets(userId) {
  ensureDbConfigured();

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);

  if ((res?.documents || []).length > 0) return res.documents;

  const t = nowIso();

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  const makeWallet = (currencyType) => {
    const walletId = uuid36();
    return {
      walletId,      // required string(36)
      userId,        // required string(36)
      currencyType,  // required enum: add elements main/trading/affiliate
      balance: 0,    // required double
      isActive: true,// required boolean
      createdDate: t,// required datetime
      updatedDate: t,// datetime
    };
  };

  const w1 = makeWallet("main");
  const w2 = makeWallet("trading");
  const w3 = makeWallet("affiliate");

  return await Promise.all([
    databases.createDocument(DB_ID, COLLECTIONS.wallets, w1.walletId, w1, perms),
    databases.createDocument(DB_ID, COLLECTIONS.wallets, w2.walletId, w2, perms),
    databases.createDocument(DB_ID, COLLECTIONS.wallets, w3.walletId, w3, perms),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Affiliate (aligned to your schemas)                                         */
/* -------------------------------------------------------------------------- */

/**
 * REQUIRES SCHEMA FIX:
 * affiliate_account.userId must be STRING to store Appwrite user.$id
 */
async function ensureAffiliateAccount(user) {
  ensureDbConfigured();
  const userId = user?.$id;
  if (!userId) throw new Error("Missing user.$id");

  const existing = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(1),
  ]);

  if (existing?.documents?.length) return existing.documents[0];

  const t = nowIso();
  const affiliateId = newAffiliateIdInt();

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  // Match affiliate_account schema
  return await databases.createDocument(
    DB_ID,
    COLLECTIONS.affiliateAccounts,
    IDHelper.unique(),
    {
      affiliateId,          // required integer
      userId,               // required string (after you fix schema)
      commissionRate: 5,    // required double (example default)
      totalEarned: 0,       // optional
      lastPaymentDate: null,// optional datetime
      joinDate: t,          // required datetime
      status: "active",     // required enum (ensure enum contains "active")
    },
    perms
  );
}

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
    QueryHelper.equal("userId", id),
    QueryHelper.limit(1),
  ]);

  return res?.documents?.[0] || null;
}

/**
 * Referrals schema:
 * - referrerAffiliateId (integer)
 */
export async function getAffiliateOverview(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const acct = await getAffiliateAccount(id);
  const affiliateIdInt = acct?.affiliateId;

  if (typeof affiliateIdInt !== "number") {
    return { affiliateId: null, referrals: [], commissions: [] };
  }

  const referralsRes = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateReferrals, [
    QueryHelper.equal("referrerAffiliateId", affiliateIdInt),
    QueryHelper.limit(200),
  ]);

  // COMMISSIONS: your schema uses affiliateId (currently string),
  // but you MUST change it to integer to match affiliate_account/referrals.
  // After you change it to integer, this works.
  const commissionsRes = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateCommissions, [
    QueryHelper.equal("affiliateId", affiliateIdInt),
    QueryHelper.limit(200),
  ]);

  return {
    affiliateId: affiliateIdInt,
    referrals: referralsRes?.documents || [],
    commissions: commissionsRes?.documents || [],
  };
}

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                    */
/* -------------------------------------------------------------------------- */

export async function ensureUserBootstrap(user) {
  const profile = await createUserProfileIfMissing(user);

  // wallets
  await ensureWallets(user.$id);

  // affiliate account (safe – but will error until schema fix is done)
  try {
    await ensureAffiliateAccount(user);
  } catch (e) {
    console.warn("Affiliate bootstrap skipped (check affiliate_account.userId type):", e);
  }

  return profile;
}

/* -------------------------------------------------------------------------- */
/* 6-digit verification (MAIN gate)                                            */
/* -------------------------------------------------------------------------- */

export async function requestVerificationCode() {
  ensureDbConfigured();

  const current = await getCurrentUser();
  if (!current) throw new Error("You must be signed in to request a code.");

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

    return payload;
  }

  // DEV fallback
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAtIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCode: code,
    verificationCodeExpiresAt: expiresAtIso,
    verificationCodeVerified: false,
    updatedAt: nowIso(),
  });

  return { ok: true, expiresAt: expiresAtIso, devCode: code };
}

export async function confirmVerificationCode(inputCode) {
  ensureDbConfigured();

  const current = await getCurrentUser();
  if (!current) throw new Error("You must be signed in.");

  const profile = await databases.getDocument(DB_ID, COLLECTIONS.userProfiles, current.$id);

  if (Boolean(profile?.verificationCodeVerified)) return { ok: true };

  const stored = String(profile?.verificationCode || "");
  const expiresAt = profile?.verificationCodeExpiresAt || null;

  if (!stored || stored.length !== 6) {
    throw new Error("No verification code found. Please generate a new one.");
  }

  if (!expiresAt) {
    throw new Error("Verification code is missing expiry. Generate a new code.");
  }

  const expMs = new Date(expiresAt).getTime();
  if (Number.isFinite(expMs) && Date.now() > expMs) {
    throw new Error("Verification code expired. Please generate a new code.");
  }

  if (String(inputCode || "").trim() !== stored) {
    throw new Error("Invalid code. Please try again.");
  }

  await databases.updateDocument(DB_ID, COLLECTIONS.userProfiles, current.$id, {
    verificationCodeVerified: true,
    verificationCode: "",
    verificationCodeExpiresAt: null,
    updatedAt: nowIso(),
  });

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                         */
/* -------------------------------------------------------------------------- */

export async function getUserWallets(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", id),
    QueryHelper.limit(50),
  ]);

  return res?.documents || [];
}

export async function getUserTransactions(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.transactions, [
    QueryHelper.equal("userId", id),
    QueryHelper.limit(100),
  ]);

  return res?.documents || [];
}

export async function getUserAlerts(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", id),
    QueryHelper.limit(100),
  ]);

  return res?.documents || [];
}

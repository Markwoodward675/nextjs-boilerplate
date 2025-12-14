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
/* Collections (match your Appwrite Table IDs)                                 */
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

// 36-char UUID for schema fields that require size 36
function uuid36() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Try listDocuments with different query attribute names until one works.
 * If schema doesn’t contain the attribute, Appwrite returns 400 "Invalid query".
 * We catch and try the next attribute. Final fallback: listDocuments with limit only.
 */
async function listDocumentsByAnyAttr({
  collectionId,
  attrs,
  value,
  limit = 200,
}) {
  ensureDbConfigured();

  // Try attribute-based queries first
  for (const attr of attrs) {
    try {
      const res = await databases.listDocuments(DB_ID, collectionId, [
        QueryHelper.equal(attr, value),
        QueryHelper.limit(limit),
      ]);
      return res?.documents || [];
    } catch (e) {
      const msg = getErrorMessage(e, "");
      // Only skip to next attr if it's the schema/invalid query error
      if (
        msg.toLowerCase().includes("invalid query") ||
        msg.toLowerCase().includes("attribute not found")
      ) {
        continue;
      }
      // any other error should bubble up
      throw e;
    }
  }

  // Safe fallback: list without filters (should still be permission-scoped to the user)
  const res = await databases.listDocuments(DB_ID, collectionId, [
    QueryHelper.limit(limit),
  ]);
  return res?.documents || [];
}

/* -------------------------------------------------------------------------- */
/* Appwrite SDK compat (handles older/newer SDK differences)                   */
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

  // Optional email-link verification (fallback)
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
 * OPTIONAL email-link verification. Not the main gate anymore.
 */
export async function resendVerificationEmail(redirectUrl) {
  const url =
    redirectUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/verify`
      : "https://example.com/verify");

  try {
    return await account.createVerification(url);
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to resend verification email."));
  }
}

/* -------------------------------------------------------------------------- */
/* Profile / Bootstrap (profile docId = user.$id)                              */
/* -------------------------------------------------------------------------- */

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
  } catch {
    // create below
  }

  const t = nowIso();

  // Match your user_profile columns (and types)
  const profileData = {
    userId, // string(255)
    username: makeUsername(user), // string(50)
    fullName: user?.name || "", // string(100)
    email: user?.email || "", // string(64)

    role: "user", // string(64)
    kycStatus: "not_submitted", // string(64)

    verificationCode: "", // string(64)
    verificationCodeExpiresAt: null, // datetime
    verificationCodeVerified: false, // ✅ boolean

    displayName: user?.name || "",

    createdAt: t, // datetime
    updatedAt: t, // datetime
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

/**
 * Wallets bootstrap that matches your wallets schema:
 * walletId (string 36), userId (string 36), currencyType (enum), balance (double),
 * isActive (boolean), createdDate (datetime), updatedDate (datetime)
 */
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
      walletId,
      userId,
      currencyType, // ensure your enum contains: main, trading, affiliate
      balance: 0,
      isActive: true,
      createdDate: t,
      updatedDate: t,
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

// Best-effort bonus alert (won’t crash if alerts schema differs)
async function ensureSignupBonusAlert(userId) {
  ensureDbConfigured();

  try {
    const existing = await listDocumentsByAnyAttr({
      collectionId: COLLECTIONS.alerts,
      attrs: ["userId"],
      value: userId,
      limit: 200,
    });

    const already = (existing || []).find((d) => d?.category === "signup_bonus");
    if (already) return already;

    const t = nowIso();
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
          "Welcome to Day Trader. Claim your one-time $100 signup bonus after your first deposit and first trade/investment.",
        category: "signup_bonus",
        status: "claimable",
        claimed: false,
        bonusAmount: 100,
        createdAt: t,
        updatedAt: t,
      },
      perms
    );
  } catch (e) {
    console.warn("Signup bonus alert skipped (schema mismatch likely):", e);
    return null;
  }
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

    return payload; // { ok:true, expiresAt }
  }

  // DEV fallback: generate + store in profile
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

  const profile = await databases.getDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    current.$id
  );

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
/* Reads for dashboard / pages                                                 */
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

/* -------------------------------------------------------------------------- */
/* Affiliate (schema-safe)                                                     */
/* -------------------------------------------------------------------------- */

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  // Some schemas use userId, others use affiliateUserId, ownerId, etc.
  const docs = await listDocumentsByAnyAttr({
    collectionId: COLLECTIONS.affiliateAccounts,
    attrs: ["userId", "affiliateUserId", "ownerId", "accountUserId"],
    value: id,
    limit: 50,
  });

  // If permissions are per-user, docs likely already scoped.
  // Still pick best matching doc if it has a field.
  const exact =
    docs.find((d) => d?.userId === id) ||
    docs.find((d) => d?.affiliateUserId === id) ||
    docs.find((d) => d?.ownerId === id) ||
    docs[0] ||
    null;

  return exact;
}

export async function getAffiliateOverview(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const [referrals, commissions] = await Promise.all([
    listDocumentsByAnyAttr({
      collectionId: COLLECTIONS.affiliateReferrals,
      // Your error shows affiliateUserId is missing, so we try several common names.
      attrs: ["affiliateUserId", "userId", "referrerUserId", "affiliateId", "referrerId"],
      value: id,
      limit: 200,
    }),
    listDocumentsByAnyAttr({
      collectionId: COLLECTIONS.affiliateCommissions,
      attrs: ["affiliateUserId", "userId", "referrerUserId", "affiliateId", "referrerId"],
      value: id,
      limit: 200,
    }),
  ]);

  return { referrals, commissions };
}

/* -------------------------------------------------------------------------- */
/* Signup bonus claim (best-effort)                                            */
/* -------------------------------------------------------------------------- */

export async function claimSignupBonus() {
  ensureDbConfigured();

  const current = await getCurrentUser();
  if (!current) throw new Error("You must be signed in.");

  const userId = current.$id;

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
    QueryHelper.equal("userId", userId),
    QueryHelper.equal("category", "signup_bonus"),
    QueryHelper.limit(1),
  ]);

  if (!res?.documents || res.documents.length === 0) {
    throw new Error("Signup bonus not found.");
  }

  const bonus = res.documents[0];

  if (bonus.claimed === true || bonus.status === "claimed") {
    throw new Error("Bonus already claimed.");
  }

  const t = nowIso();

  return await databases.updateDocument(DB_ID, COLLECTIONS.alerts, bonus.$id, {
    claimed: true,
    status: "claimed",
    claimedAt: t,
    updatedAt: t,
  });
}

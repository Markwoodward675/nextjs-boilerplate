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
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); // 36 chars
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function nowIso() {
  return new Date().toISOString();
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
      // new signature style
      return await anyAccount.create({
        userId: IDHelper.unique(),
        email,
        password,
        name: fullName || "",
      });
    } catch {
      // classic signature style
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
  const user = await createAccountCompat(fullName, email, password);

  // Optional: send email-link verification (fallback system)
  // You said it’s optional, so we do NOT enforce it.
  try {
    await resendVerificationEmail();
  } catch {}

  // Best-effort bootstrap
  try {
    await ensureUserBootstrap(user);
  } catch (e) {
    console.warn("Bootstrap after signup failed:", e);
  }

  return { user };
}

export async function loginWithEmailPassword(email, password) {
  // Optional: clear session if different user is logged in
  try {
    const existing = await account.get();
    if (existing?.email && existing.email !== email) {
      await account.deleteSession("current");
    }
  } catch {}

  await createEmailSessionCompat(email, password);
  const user = await account.get();

  // Best-effort bootstrap
  try {
    await ensureUserBootstrap(user);
  } catch (e) {
    console.warn("Bootstrap after login failed:", e);
  }

  return user;
}

/**
 * OPTIONAL email-link verification.
 * This is NOT the main gate anymore (6-digit is main gate).
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

/**
 * Get profile. If userId omitted, uses current session user.
 */
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

  // Must match your user_profile columns
  const profileData = {
    userId, // string(255)
    username: makeUsername(user), // string(50)
    fullName: user?.name || "", // string(100)
    email: user?.email || "", // string(64)

    role: "user", // string(64)
    kycStatus: "not_submitted", // string(64)

    // 6-digit verification fields
    verificationCode: "", // string(64)
    verificationCodeExpiresAt: null, // datetime
    verificationCodeVerified: false, // ✅ boolean

    // Optional (exists in your schema)
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
 * Wallets bootstrap that matches your wallets schema EXACTLY:
 * walletId, userId, currencyType(enum), balance(double), isActive(boolean), createdDate(datetime), updatedDate(datetime)
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
    const walletId = uuid36(); // size 36
    return {
      walletId, // required string(36)
      userId, // required string(36)
      currencyType, // required enum: "main" | "trading" | "affiliate"
      balance: 0, // required double
      isActive: true, // required boolean
      createdDate: t, // required datetime
      updatedDate: t, // datetime (you have a default but we can set it too)
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

/**
 * Alerts schema varies a lot across your iterations.
 * So this is BEST-EFFORT: it won’t break bootstrap if your alerts table doesn’t match.
 */
async function ensureSignupBonusAlert(userId) {
  ensureDbConfigured();

  try {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.alerts, [
      QueryHelper.equal("userId", userId),
      QueryHelper.equal("category", "signup_bonus"),
      QueryHelper.limit(1),
    ]);

    if ((res?.documents || []).length > 0) return res.documents[0];

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

  // optional; does not block
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
/* Affiliate helpers (safe reads)                                              */
/* -------------------------------------------------------------------------- */

export async function getAffiliateAccount(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const res = await databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
    QueryHelper.equal("userId", id),
    QueryHelper.limit(1),
  ]);

  return res?.total > 0 ? res.documents[0] : null;
}

export async function getAffiliateOverview(userId) {
  ensureDbConfigured();

  const id = userId || (await getCurrentUser())?.$id;
  if (!id) throw new Error("You must be signed in.");

  const [referrals, commissions] = await Promise.all([
    databases.listDocuments(DB_ID, COLLECTIONS.affiliateReferrals, [
      QueryHelper.equal("affiliateUserId", id),
      QueryHelper.limit(200),
    ]),
    databases.listDocuments(DB_ID, COLLECTIONS.affiliateCommissions, [
      QueryHelper.equal("affiliateUserId", id),
      QueryHelper.limit(200),
    ]),
  ]);

  return {
    referrals: referrals?.documents || [],
    commissions: commissions?.documents || [],
  };
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

"use client";

import {
  account,
  databases,
  storage,
  DB_ID,
  ENDPOINT,
  PROJECT_ID,
  USERS_COLLECTION_ID,
  WALLETS_COLLECTION_ID,
  TRANSACTIONS_COLLECTION_ID,
  ALERTS_COLLECTION_ID,
  AFFILIATE_ACCOUNT_COLLECTION_ID,
  AFFILIATE_REFERRALS_COLLECTION_ID,
  AFFILIATE_COMMISSIONS_COLLECTION_ID,
  PROFILE_PICS_BUCKET_ID,
  QueryHelper,
  IDHelper,
  Permission,
  Role,
} from "./appwrite";

/**
 * IMPORTANT:
 * - Appwrite Account user.$id is NOT 36 chars.
 * - Your wallets/transactions tables require Size:36 userId.
 * So we store a 36-char UUID in user_profile.userId and use that everywhere else.
 */

const WALLET_TYPES = {
  MAIN: "main",
  TRADING: "trading",
  AFFILIATE: "affiliate",
};

const TX_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  INVEST: "invest",
  TRADE: "trade",
  GIFTCARD_BUY: "giftcard_buy",
  GIFTCARD_SELL: "giftcard_sell",
  ADMIN_ADJUSTMENT: "admin_adjustment",
  COMMISSION: "commission",
  AIRDROP: "airdrop",
};

function nowISO() {
  return new Date().toISOString();
}

function uuid36() {
  // browser-safe UUID v4 (36 chars)
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeUsername(user) {
  const base =
    (user?.name || user?.email || "user")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "user";
  return (base.length > 20 ? base.slice(0, 20) : base) + "_" + (Math.random() * 9000 + 1000).toFixed(0);
}

function ensureDbConfigured() {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

function fileViewUrl(bucketId, fileId) {
  // Authenticated view endpoint
  return `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${PROJECT_ID}`;
}

/** Auth */
export async function signUp({ fullName, email, password }) {
  // Create user + session
  const user = await account.create(IDHelper.unique(), email, password, fullName || "");
  await account.createEmailPasswordSession(email, password);
  return user;
}

export async function signIn({ email, password }) {
  return account.createEmailPasswordSession(email, password);
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
  export async function registerUser(payload) {
  return signUp(payload);
}

}
export async function loginUser(payload) {
  return signIn(payload);
}

/** Email link verification (optional feature) */
export async function resendVerificationEmail() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const redirectUrl = `${base}/verify`; // optional page
  return account.createVerification(redirectUrl);
}

/** Profiles */
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function getUserProfileByDocId(userDocId) {
  ensureDbConfigured();
  return databases.getDocument(DB_ID, USERS_COLLECTION_ID, userDocId);
}

export async function updateUserProfile(userDocId, patch) {
  ensureDbConfigured();
  const safePatch = { ...patch, updatedAt: nowISO() };
  return databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDocId, safePatch);
}

/**
 * Creates user_profile with docId = user.$id.
 * Ensures:
 * - user_profile.userId = stable UUID (36 chars)
 * - referrerAffiliateId is stored if provided and empty
 */
export async function createUserProfileIfMissing(user, { referrerAffiliateId } = {}) {
  ensureDbConfigured();
  const userDocId = user?.$id;
  if (!userDocId) throw new Error("Missing user.$id");

  try {
    const existing = await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userDocId);

    // ensure a stable 36-char UUID exists in profile.userId
    if (!existing.userId || String(existing.userId).length < 32) {
      const newUuid = uuid36();
      return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDocId, {
        userId: newUuid,
        updatedAt: nowISO(),
      });
    }

    // attach referrerAffiliateId if provided and missing
    if (referrerAffiliateId && !existing.referrerAffiliateId) {
      return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDocId, {
        referrerAffiliateId: Number(referrerAffiliateId),
        updatedAt: nowISO(),
      });
    }

    return existing;
  } catch {
    // create new
  }

  const now = nowISO();
  const profileUuid = uuid36();

  const profileData = {
    // required-ish in your schema (not required columns, but used in UI)
    username: makeUsername(user),
    fullName: user?.name || "",
    displayName: user?.name || "",
    email: user?.email || "",
    role: "user",
    kycStatus: "pending",

    // verification gate
    verificationCode: "",
    verificationCodeExpiresAt: null,
    verificationCodeVerified: false,

    // country lock fields
    country: "",
    address: "",
    countryLocked: false,

    // storage fields
    profileImageFileId: "",
    profileImageUrl: "",
    kycDocFileId: "",
    kycDocFileName: "",

    // IMPORTANT mapping key (36 chars for wallets/tx tables)
    userId: profileUuid,

    // affiliate
    referrerAffiliateId: referrerAffiliateId ? Number(referrerAffiliateId) : null,

    createdAt: now,
    updatedAt: now,
  };

  const perms = [
    Permission.read(Role.user(userDocId)),
    Permission.update(Role.user(userDocId)),
    Permission.delete(Role.user(userDocId)),
  ];

  return databases.createDocument(DB_ID, USERS_COLLECTION_ID, userDocId, profileData, perms);
}

/** Wallets */
export async function getUserWallets(profileUserUuid) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, WALLETS_COLLECTION_ID, [
    QueryHelper.equal("userId", String(profileUserUuid)),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

async function createWallet(profileUserUuid, currencyType) {
  ensureDbConfigured();
  const now = nowISO();

  const walletId = uuid36(); // required Size:36
  const docId = IDHelper.unique();

  // wallet.userId REQUIRED Size:36 -> MUST be profile.userId uuid36
  const data = {
    walletId,
    userId: String(profileUserUuid),
    currencyType, // enum
    balance: 0,
    isActive: true,
    createdDate: now,
    updatedDate: now,
  };

  // Owner permissions: use Appwrite user.$id as Role.user
  // (We don't have it here; set permissions at bootstrap call where we have user.$id)
  return { docId, data, walletId };
}

export async function ensureWallets(profileUserUuid, appwriteUserDocId) {
  ensureDbConfigured();
  const existing = await getUserWallets(profileUserUuid);
  const typesHave = new Set(existing.map((w) => w.currencyType));

  const needed = [WALLET_TYPES.MAIN, WALLET_TYPES.TRADING, WALLET_TYPES.AFFILIATE].filter(
    (t) => !typesHave.has(t)
  );

  if (!needed.length) return existing;

  const perms = [
    Permission.read(Role.user(appwriteUserDocId)),
    Permission.update(Role.user(appwriteUserDocId)),
    Permission.delete(Role.user(appwriteUserDocId)),
  ];

  const created = [];
  for (const t of needed) {
    const w = await createWallet(profileUserUuid, t);
    const doc = await databases.createDocument(DB_ID, WALLETS_COLLECTION_ID, w.docId, w.data, perms);
    created.push(doc);
  }

  return [...existing, ...created];
}

/** Transactions (schema-aligned) */
export async function createTransaction({
  profileUserUuid, // 36-char UUID from user_profile.userId
  walletId,        // 36-char walletId from wallet document
  amount,
  currencyType,    // enum
  transactionType, // enum
  extra,           // optional (type/status/meta)
}) {
  ensureDbConfigured();
  const txId = uuid36(); // required Size:36
  const docId = IDHelper.unique();

  const base = {
    transactionId: txId,
    userId: String(profileUserUuid),
    walletId: String(walletId),
    amount: Number(amount || 0),
    currencyType,
    transactionType,
    transactionDate: nowISO(),
  };

  // Optional columns (only if you created them in Appwrite)
  const withOptional = { ...base };
  if (extra?.status != null) withOptional.status = String(extra.status);
  if (extra?.type != null) withOptional.type = String(extra.type);
  if (extra?.meta != null) withOptional.meta = typeof extra.meta === "string" ? extra.meta : JSON.stringify(extra.meta);

  try {
    return await databases.createDocument(DB_ID, TRANSACTIONS_COLLECTION_ID, docId, withOptional);
  } catch (e) {
    // if optional columns don't exist, retry without them
    return await databases.createDocument(DB_ID, TRANSACTIONS_COLLECTION_ID, docId, base);
  }
}

export async function getUserTransactions(profileUserUuid, limit = 25) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, TRANSACTIONS_COLLECTION_ID, [
    QueryHelper.equal("userId", String(profileUserUuid)),
    QueryHelper.orderDesc("transactionDate"),
    QueryHelper.limit(limit),
  ]);
  return res?.documents || [];
}

/** Alerts (schema unknown – we try, but won’t break app if your alerts table differs) */
export async function createAlert(appwriteUserDocId, { title, body, kind = "info" }) {
  ensureDbConfigured();
  const now = nowISO();
  const payload = {
    userId: appwriteUserDocId,
    title,
    body,
    kind,
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await databases.createDocument(DB_ID, ALERTS_COLLECTION_ID, IDHelper.unique(), payload);
  } catch {
    return null;
  }
}

export async function getUserAlerts(appwriteUserDocId, limit = 20) {
  ensureDbConfigured();
  try {
    const res = await databases.listDocuments(DB_ID, ALERTS_COLLECTION_ID, [
      QueryHelper.equal("userId", String(appwriteUserDocId)),
      QueryHelper.orderDesc("$createdAt"),
      QueryHelper.limit(limit),
    ]);
    return res?.documents || [];
  } catch {
    return [];
  }
}

/** 6-digit verification gate */
export async function createOrRefreshVerifyCode(appwriteUserDocId) {
  ensureDbConfigured();
  const profile = await getUserProfileByDocId(appwriteUserDocId);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const updated = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, appwriteUserDocId, {
    verificationCode: code,
    verificationCodeExpiresAt: expires,
    verificationCodeVerified: false,
    updatedAt: nowISO(),
  });

  // optional notification
  await createAlert(appwriteUserDocId, {
    title: "Access code generated",
    body: `Your access code: ${code}`,
    kind: "info",
  });

  return updated;
}

export async function verifyCode(appwriteUserDocId, code) {
  ensureDbConfigured();
  const profile = await getUserProfileByDocId(appwriteUserDocId);

  const expected = String(profile?.verificationCode || "");
  const exp = profile?.verificationCodeExpiresAt ? new Date(profile.verificationCodeExpiresAt).getTime() : 0;

  if (!expected) throw new Error("No active code. Generate a new code.");
  if (Date.now() > exp) throw new Error("Code expired. Generate a new code.");
  if (String(code || "") !== expected) throw new Error("Invalid code.");

  const updated = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, appwriteUserDocId, {
    verificationCodeVerified: true,
    verificationCode: "",
    verificationCodeExpiresAt: null,
    updatedAt: nowISO(),
  });

  await createAlert(appwriteUserDocId, {
    title: "Account access verified",
    body: "Verification complete.",
    kind: "info",
  });

  return updated;
}

/** Storage uploads (single bucket: Profile Pics) */
export async function uploadProfilePicture(appwriteUserDocId, file) {
  if (!file) throw new Error("Select a file.");
  ensureDbConfigured();

  const created = await storage.createFile(PROFILE_PICS_BUCKET_ID, IDHelper.unique(), file);
  const url = fileViewUrl(PROFILE_PICS_BUCKET_ID, created.$id);

  await updateUserProfile(appwriteUserDocId, {
    profileImageFileId: created.$id,
    profileImageUrl: url,
  });

  return { fileId: created.$id, url };
}

export async function uploadKycDocument(appwriteUserDocId, file) {
  if (!file) throw new Error("Select a file.");
  ensureDbConfigured();

  const created = await storage.createFile(PROFILE_PICS_BUCKET_ID, IDHelper.unique(), file);
  await updateUserProfile(appwriteUserDocId, {
    kycDocFileId: created.$id,
    kycDocFileName: file?.name || "",
    kycStatus: "pending",
  });

  await createAlert(appwriteUserDocId, {
    title: "KYC document submitted",
    body: "Your document is under review.",
    kind: "info",
  });

  return { fileId: created.$id, name: file?.name || "" };
}

/** Affiliate */
export async function ensureAffiliateAccount(appwriteUserDocId) {
  ensureDbConfigured();

  // if already exists
  const res = await databases.listDocuments(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, [
    QueryHelper.equal("userId", String(appwriteUserDocId)),
    QueryHelper.limit(1),
  ]);
  if (res.documents?.length) return res.documents[0];

  // create new affiliate account
  const affiliateId = Math.floor(100000 + Math.random() * 900000); // integer
  const now = nowISO();

  const perms = [
    Permission.read(Role.user(appwriteUserDocId)),
    Permission.update(Role.user(appwriteUserDocId)),
    Permission.delete(Role.user(appwriteUserDocId)),
  ];

  const doc = await databases.createDocument(
    DB_ID,
    AFFILIATE_ACCOUNT_COLLECTION_ID,
    IDHelper.unique(),
    {
      affiliateId,
      userId: String(appwriteUserDocId), // your schema: string Size 255
      commissionRate: 5, // %
      totalEarned: 0,
      lastPaymentDate: null,
      joinDate: now,
      status: "active",
    },
    perms
  );

  return doc;
}

export async function getAffiliateSummary(appwriteUserDocId, limit = 25) {
  ensureDbConfigured();
  const accRes = await databases.listDocuments(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, [
    QueryHelper.equal("userId", String(appwriteUserDocId)),
    QueryHelper.limit(1),
  ]);
  const accountDoc = accRes.documents?.[0] || null;

  const affiliateId = accountDoc?.affiliateId;

  let commissions = [];
  try {
    const cRes = await databases.listDocuments(DB_ID, AFFILIATE_COMMISSIONS_COLLECTION_ID, [
      QueryHelper.equal("userId", String(appwriteUserDocId)),
      QueryHelper.orderDesc("commissionDate"),
      QueryHelper.limit(limit),
    ]);
    commissions = cRes.documents || [];
  } catch {
    commissions = [];
  }

  let referrals = [];
  try {
    if (AFFILIATE_REFERRALS_COLLECTION_ID && affiliateId != null) {
      const rRes = await databases.listDocuments(DB_ID, AFFILIATE_REFERRALS_COLLECTION_ID, [
        QueryHelper.equal("referrerAffiliateId", Number(affiliateId)),
        QueryHelper.orderDesc("$createdAt"),
        QueryHelper.limit(limit),
      ]);
      referrals = rRes.documents || [];
    }
  } catch {
    referrals = [];
  }

  return { affiliateId, accountDoc, commissions, referrals };
}

/**
 * Signup bonus hook (exported so builds stop warning).
 * You can enable it only after you add:
 * - transactions.transactionType enum includes "airdrop"
 * - wallet currencyType includes "main" (or whichever wallet to credit)
 */
export async function claimSignupBonus(appwriteUserDocId) {
  ensureDbConfigured();
  const boot = await ensureUserBootstrap();
  const profile = boot.profile;

  // credit MAIN wallet by creating a transaction entry (Admin IPN should credit balance on approval),
  // OR you can credit immediately if your rules allow.
  const wallets = boot.wallets || [];
  const main = wallets.find((w) => w.currencyType === WALLET_TYPES.MAIN);

  if (!main) throw new Error("Main wallet not available.");
  const amount = 100;

  // create a transaction record
  await createTransaction({
    profileUserUuid: profile.userId,
    walletId: String(main.walletId || main.$id),
    amount,
    currencyType: main.currencyType,
    transactionType: TX_TYPES.AIRDROP,
    extra: { status: "completed", type: "signup_bonus", meta: { reason: "signup" } },
  });

  await createAlert(appwriteUserDocId, {
    title: "Bonus credited",
    body: "Bonus entry recorded.",
    kind: "info",
  });

  return { ok: true };
}

/**
 * MASTER BOOTSTRAP
 * Returns:
 * - user (Appwrite account)
 * - profile (user_profile doc)
 * - wallets (wallet docs)
 * - transactions preview (optional)
 */
export async function ensureUserBootstrap({ referrerAffiliateId } = {}) {
  ensureDbConfigured();

  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const profile = await createUserProfileIfMissing(user, { referrerAffiliateId });

  // ensure wallets (using profile.userId UUID for wallets.userId required Size:36)
  const wallets = await ensureWallets(profile.userId, user.$id);

  return { user, profile, wallets };
}

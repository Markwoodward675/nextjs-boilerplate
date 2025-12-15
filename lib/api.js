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

export const WALLET_TYPES = {
  MAIN: "main",
  TRADING: "trading",
  AFFILIATE: "affiliate",
};

export const TX_TYPES = {
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
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
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
  return (
    (base.length > 20 ? base.slice(0, 20) : base) +
    "_" +
    (Math.random() * 9000 + 1000).toFixed(0)
  );
}

function ensureDbConfigured() {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

function fileViewUrl(bucketId, fileId) {
  return `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${PROJECT_ID}`;
}

/* =========================
   AUTH (exported + aliases)
   ========================= */

export async function signUp({ fullName, email, password }) {
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
}

// Aliases for older pages (prevents "is not a function")
export async function registerUser(payload) {
  return signUp(payload);
}
export async function loginUser(payload) {
  return signIn(payload);
}

/* =========================
   EMAIL VERIFICATION (optional)
   ========================= */

export async function resendVerificationEmail() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const redirectUrl = `${base}/verify`;
  return account.createVerification(redirectUrl);
}

/* =========================
   USER / PROFILE
   ========================= */

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

export async function createUserProfileIfMissing(user, { referrerAffiliateId } = {}) {
  ensureDbConfigured();
  const userDocId = user?.$id;
  if (!userDocId) throw new Error("Missing user.$id");

  try {
    const existing = await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userDocId);

    // Ensure stable 36-char UUID exists in profile.userId
    if (!existing.userId || String(existing.userId).length < 32) {
      const newUuid = uuid36();
      return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDocId, {
        userId: newUuid,
        updatedAt: nowISO(),
      });
    }

    // Attach referrerAffiliateId if provided and missing
    if (referrerAffiliateId != null && existing.referrerAffiliateId == null) {
      return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userDocId, {
        referrerAffiliateId: Number(referrerAffiliateId),
        updatedAt: nowISO(),
      });
    }

    return existing;
  } catch {
    // Create new
  }

  const now = nowISO();
  const profileUuid = uuid36();

  const profileData = {
    username: makeUsername(user),
    fullName: user?.name || "",
    displayName: user?.name || "",
    email: user?.email || "",
    role: "user",
    kycStatus: "pending",

    verificationCode: "",
    verificationCodeExpiresAt: null,
    verificationCodeVerified: false,

    country: "",
    address: "",
    countryLocked: false,

    profileImageFileId: "",
    profileImageUrl: "",
    kycDocFileId: "",
    kycDocFileName: "",

    userId: profileUuid,

    referrerAffiliateId: referrerAffiliateId != null ? Number(referrerAffiliateId) : null,

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

/* =========================
   WALLETS
   ========================= */

export async function getUserWallets(profileUserUuid) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, WALLETS_COLLECTION_ID, [
    QueryHelper.equal("userId", String(profileUserUuid)),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

async function makeWalletDoc(profileUserUuid, currencyType) {
  const now = nowISO();
  const walletId = uuid36(); // required Size:36
  const docId = IDHelper.unique();

  const data = {
    walletId,
    userId: String(profileUserUuid), // required Size:36 UUID
    currencyType, // enum
    balance: 0,
    isActive: true,
    createdDate: now,
    updatedDate: now,
  };

  return { docId, data };
}

export async function ensureWallets(profileUserUuid, appwriteUserDocId) {
  ensureDbConfigured();

  const existing = await getUserWallets(profileUserUuid);
  const have = new Set(existing.map((w) => w.currencyType));

  const needed = [WALLET_TYPES.MAIN, WALLET_TYPES.TRADING, WALLET_TYPES.AFFILIATE].filter(
    (t) => !have.has(t)
  );
  if (!needed.length) return existing;

  const perms = [
    Permission.read(Role.user(appwriteUserDocId)),
    Permission.update(Role.user(appwriteUserDocId)),
    Permission.delete(Role.user(appwriteUserDocId)),
  ];

  const created = [];
  for (const t of needed) {
    const w = await makeWalletDoc(profileUserUuid, t);
    const doc = await databases.createDocument(DB_ID, WALLETS_COLLECTION_ID, w.docId, w.data, perms);
    created.push(doc);
  }

  return [...existing, ...created];
}

/* =========================
   TRANSACTIONS
   ========================= */

export async function createTransaction({
  profileUserUuid,
  walletId,
  amount,
  currencyType,
  transactionType,
  extra, // {type,status,meta} optional columns
}) {
  ensureDbConfigured();

  const txId = uuid36(); // required Size:36
  const docId = IDHelper.unique();

  const base = {
    transactionId: txId,
    userId: String(profileUserUuid), // required Size:36 UUID
    walletId: String(walletId), // required Size:36
    amount: Number(amount || 0),
    currencyType,
    transactionType,
    transactionDate: nowISO(),
  };

  const withOptional = { ...base };
  if (extra?.status != null) withOptional.status = String(extra.status);
  if (extra?.type != null) withOptional.type = String(extra.type);
  if (extra?.meta != null)
    withOptional.meta = typeof extra.meta === "string" ? extra.meta : JSON.stringify(extra.meta);

  try {
    return await databases.createDocument(DB_ID, TRANSACTIONS_COLLECTION_ID, docId, withOptional);
  } catch {
    // optional cols might not exist; retry base
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

/* =========================
   ALERTS (best-effort)
   ========================= */

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

/* =========================
   6-DIGIT VERIFY CODE
   ========================= */

export async function createOrRefreshVerifyCode(appwriteUserDocId) {
  ensureDbConfigured();

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const updated = await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, appwriteUserDocId, {
    verificationCode: code,
    verificationCodeExpiresAt: expires,
    verificationCodeVerified: false,
    updatedAt: nowISO(),
  });

  await createAlert(appwriteUserDocId, {
    title: "Verification code generated",
    body: `Your code: ${code}`,
    kind: "info",
  });

  return updated;
}

export async function verifyCode(appwriteUserDocId, code) {
  ensureDbConfigured();
  const profile = await getUserProfileByDocId(appwriteUserDocId);

  const expected = String(profile?.verificationCode || "");
  const exp = profile?.verificationCodeExpiresAt
    ? new Date(profile.verificationCodeExpiresAt).getTime()
    : 0;

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
    title: "Verification complete",
    body: "Account verified.",
    kind: "info",
  });

  return updated;
}

/* =========================
   STORAGE UPLOADS
   ========================= */

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
    title: "KYC submitted",
    body: "Your document is under review.",
    kind: "info",
  });

  return { fileId: created.$id, name: file?.name || "" };
}

/* =========================
   AFFILIATE
   ========================= */

export async function ensureAffiliateAccount(appwriteUserDocId) {
  ensureDbConfigured();

  const res = await databases.listDocuments(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, [
    QueryHelper.equal("userId", String(appwriteUserDocId)),
    QueryHelper.limit(1),
  ]);
  if (res.documents?.length) return res.documents[0];

  const affiliateId = Math.floor(100000 + Math.random() * 900000);
  const now = nowISO();

  const perms = [
    Permission.read(Role.user(appwriteUserDocId)),
    Permission.update(Role.user(appwriteUserDocId)),
    Permission.delete(Role.user(appwriteUserDocId)),
  ];

  return databases.createDocument(
    DB_ID,
    AFFILIATE_ACCOUNT_COLLECTION_ID,
    IDHelper.unique(),
    {
      affiliateId,
      userId: String(appwriteUserDocId),
      commissionRate: 5,
      totalEarned: 0,
      lastPaymentDate: null,
      joinDate: now,
      status: "active",
    },
    perms
  );
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

/* =========================
   BONUS (exported)
   ========================= */

export async function claimSignupBonus(appwriteUserDocId) {
  ensureDbConfigured();
  const boot = await ensureUserBootstrap();
  const profile = boot.profile;

  const wallets = boot.wallets || [];
  const main = wallets.find((w) => w.currencyType === WALLET_TYPES.MAIN);
  if (!main) throw new Error("Main wallet not available.");

  const amount = 100;

  await createTransaction({
    profileUserUuid: profile.userId,
    walletId: String(main.walletId || main.$id),
    amount,
    currencyType: main.currencyType,
    transactionType: TX_TYPES.AIRDROP,
    extra: { status: "completed", type: "signup_bonus", meta: { reason: "signup" } },
  });

  await createAlert(appwriteUserDocId, {
    title: "Bonus recorded",
    body: "Your bonus transaction has been recorded.",
    kind: "info",
  });

  return { ok: true };
}

/* =========================
   BOOTSTRAP (exported + aliases)
   ========================= */

export async function ensureUserBootstrap({ referrerAffiliateId } = {}) {
  ensureDbConfigured();

  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");

  const profile = await createUserProfileIfMissing(user, { referrerAffiliateId });
  const wallets = await ensureWallets(profile.userId, user.$id);

  return { user, profile, wallets };
}

// Aliases to stop old pages breaking
export const bootstrapUserData = ensureUserBootstrap;
export const ensureUserBootstrapped = ensureUserBootstrap;

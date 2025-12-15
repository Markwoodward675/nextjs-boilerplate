"use client";

import {
  account,
  databases,
  storage,
  DB_ID,
  USERS_COLLECTION_ID,
  WALLETS_COLLECTION_ID,
  TRANSACTIONS_COLLECTION_ID,
  ALERTS_COLLECTION_ID,
  AFFILIATE_ACCOUNT_COLLECTION_ID,
  AFFILIATE_REFERRALS_COLLECTION_ID,
  AFFILIATE_COMMISSIONS_COLLECTION_ID,
  PROFILE_PICS_BUCKET_ID,
  KYC_BUCKET_ID,
  IDHelper,
  QueryHelper,
  Permission,
  Role,
} from "./appwrite";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

function ensureDbConfigured() {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

function nowISO() {
  return new Date().toISOString();
}

function toMoney(n) {
  return Number(n || 0);
}

// ---------- Auth ----------
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {}
}

export async function signIn(email, password) {
  await account.createEmailPasswordSession(email, password);
  return await account.get();
}

export async function signUp({ fullName, email, password, referralId }) {
  // Create Appwrite user + session
  const u = await account.create(IDHelper.unique(), email, password, fullName || "");
  await account.createEmailPasswordSession(email, password);

  const user = await account.get();

  // Bootstrap profile + wallets
  const { profile } = await ensureUserBootstrap();

  // Track referral (optional)
  if (referralId) {
    await trackReferralOnSignup(user.$id, referralId).catch(() => {});
  }

  return { user, profile };
}

// ---------- Country by IP (locks once) ----------
async function detectCountryByIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return "";
    const data = await res.json();
    return data?.country_name || "";
  } catch {
    return "";
  }
}

// ---------- Profile ----------
export async function getUserProfile(userId) {
  ensureDbConfigured();
  return await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userId);
}

export async function createUserProfileIfMissing(user) {
  ensureDbConfigured();
  const userId = user?.$id;
  if (!userId) throw new Error("Missing user.$id");

  try {
    return await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userId);
  } catch {
    const now = nowISO();

    const profileData = {
      userId,
      email: user?.email || "",
      username: (user?.email || "user").split("@")[0].slice(0, 50),
      displayName: user?.name || "",
      fullName: user?.name || "",
      role: "user",

      // KYC state
      kycStatus: "not_submitted", // pending | approved | rejected

      // 6-digit access verification
      verificationCode: "",
      verificationCodeVerified: false,
      verificationCodeExpiresAt: null,

      // Country lock
      country: "",
      countryLocked: false,

      // Storage references
      profileImageFileId: "",
      profileImageUrl: "",
      kycDocFileId: "",
      kycDocUrl: "",
      kycSubmittedAt: null,

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
      USERS_COLLECTION_ID,
      userId, // docId = userId
      profileData,
      perms
    );
  }
}

export async function updateUserProfile(userId, patch) {
  ensureDbConfigured();
  if (!userId) throw new Error("Missing userId");

  const existing = await getUserProfile(userId);

  // Country lock enforcement
  if (existing?.countryLocked) {
    delete patch.country;
    delete patch.countryLocked;
  }

  const safe = {
    ...patch,
    updatedAt: nowISO(),
  };

  return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, safe);
}

// ---------- Wallets ----------
export async function getUserWallets(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, WALLETS_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res.documents || [];
}

export async function ensureWallets(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, WALLETS_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(10),
  ]);

  if ((res.documents || []).length) return res.documents;

  const now = nowISO();
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  // Your wallets schema requires walletId,userId,currencyType,balance,isActive,createdDate,updatedDate
  const createOne = async (currencyType) =>
    databases.createDocument(
      DB_ID,
      WALLETS_COLLECTION_ID,
      IDHelper.unique(),
      {
        walletId: crypto.randomUUID(),
        userId,
        currencyType, // enum in your schema — must include these values in the enum list in Appwrite
        balance: 0,
        isActive: true,
        createdDate: now,
        updatedDate: now,
      },
      perms
    );

  // IMPORTANT: add these values to wallets.currencyType enum in Appwrite:
  // main, trading, affiliate
  const created = await Promise.all([
    createOne("main"),
    createOne("trading"),
    createOne("affiliate"),
  ]);

  return created;
}

// ---------- Transactions ----------
export async function getUserTransactions(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, TRANSACTIONS_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.orderDesc("$createdAt"),
    QueryHelper.limit(50),
  ]);
  return res.documents || [];
}

export async function createTransaction(userId, tx) {
  ensureDbConfigured();
  const now = nowISO();
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
    DB_ID,
    TRANSACTIONS_COLLECTION_ID,
    IDHelper.unique(),
    {
      userId,
      type: tx.type || "activity",
      amount: toMoney(tx.amount),
      status: tx.status || "pending",
      meta: JSON.stringify(tx.meta || {}),
      createdAt: now,
      updatedAt: now,
    },
    perms
  );
}

// ---------- Alerts ----------
export async function getUserAlerts(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, ALERTS_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.orderDesc("$createdAt"),
    QueryHelper.limit(20),
  ]);
  return res.documents || [];
}

export async function createAlert(userId, { title, body, kind = "info" }) {
  ensureDbConfigured();
  const now = nowISO();
  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
    DB_ID,
    ALERTS_COLLECTION_ID,
    IDHelper.unique(),
    {
      userId,
      title: title || "Notification",
      body: body || "",
      kind,
      createdAt: now,
      updatedAt: now,
    },
    perms
  );
}

// ---------- 6-digit Access Verification ----------
function generate6Digit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createOrRefreshVerifyCode(userId) {
  const code = generate6Digit();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  await updateUserProfile(userId, {
    verificationCode: code,
    verificationCodeVerified: false,
    verificationCodeExpiresAt: expiresAt,
  });

  // NOTE: sending email is handled by your own email service or Appwrite Function.
  // For now, we create an alert so you can test end-to-end.
  await createAlert(userId, {
    title: "Verification code generated",
    body: `Your code is ${code} (expires in 10 minutes).`,
    kind: "security",
  });

  return { code, expiresAt };
}

export async function verify6DigitCode(userId, inputCode) {
  const profile = await getUserProfile(userId);
  const code = String(inputCode || "").trim();
  if (!code || code.length !== 6) throw new Error("Enter a 6-digit code.");

  const exp = profile?.verificationCodeExpiresAt
    ? new Date(profile.verificationCodeExpiresAt).getTime()
    : 0;

  if (!profile?.verificationCode || profile.verificationCode !== code) {
    throw new Error("Invalid verification code.");
  }
  if (exp && Date.now() > exp) {
    throw new Error("Verification code expired. Generate a new one.");
  }

  await updateUserProfile(userId, {
    verificationCodeVerified: true,
  });

  await createAlert(userId, {
    title: "Access verified",
    body: "Your access verification has been completed.",
    kind: "security",
  });

  return true;
}

// ---------- Storage uploads ----------
function fileViewUrl(bucketId, fileId) {
  // Appwrite file view endpoint
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
}

export async function uploadProfilePicture(userId, file) {
  ensureDbConfigured();
  if (!file) throw new Error("Select a file.");

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  const created = await storage.createFile(
    PROFILE_PICS_BUCKET_ID,
    IDHelper.unique(),
    file,
    perms
  );

  const url = fileViewUrl(PROFILE_PICS_BUCKET_ID, created.$id);

  await updateUserProfile(userId, {
    profileImageFileId: created.$id,
    profileImageUrl: url,
  });

  return { fileId: created.$id, url };
}

export async function uploadKycDocument(userId, file) {
  ensureDbConfigured();
  if (!file) throw new Error("Select a file.");

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  const created = await storage.createFile(
    KYC_BUCKET_ID,
    IDHelper.unique(),
    file,
    perms
  );

  const url = fileViewUrl(KYC_BUCKET_ID, created.$id);

  // once uploaded → pending until admin approves in console/admin panel
  await updateUserProfile(userId, {
    kycDocFileId: created.$id,
    kycDocUrl: url,
    kycStatus: "pending",
    kycSubmittedAt: nowISO(),
  });

  await createAlert(userId, {
    title: "KYC submitted",
    body: "Your documents have been submitted for review.",
    kind: "info",
  });

  return { fileId: created.$id, url };
}

// ---------- Affiliate logic ----------
export async function ensureAffiliateAccount(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(1),
  ]);

  if ((res.documents || []).length) return res.documents[0];

  const now = nowISO();
  const affiliateId = Math.floor(100000 + Math.random() * 900000);

  const perms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  return await databases.createDocument(
    DB_ID,
    AFFILIATE_ACCOUNT_COLLECTION_ID,
    IDHelper.unique(),
    {
      affiliateId,
      userId, // MUST be string column
      commissionRate: 10,
      totalEarned: 0,
      joinDate: now,
      status: "active",
    },
    perms
  );
}

export async function getAffiliateSummary(userId) {
  ensureDbConfigured();

  const accRes = await databases.listDocuments(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(1),
  ]);

  const account = (accRes.documents || [])[0];
  if (!account) return { affiliateId: null, referrals: [], commissions: [] };

  const affiliateId = account.affiliateId;

  const [refRes, comRes] = await Promise.all([
    databases.listDocuments(DB_ID, AFFILIATE_REFERRALS_COLLECTION_ID, [
      QueryHelper.equal("referrerAffiliateId", affiliateId),
      QueryHelper.limit(50),
    ]),
    databases.listDocuments(DB_ID, AFFILIATE_COMMISSIONS_COLLECTION_ID, [
      QueryHelper.equal("affiliateId", String(affiliateId)),
      QueryHelper.orderDesc("$createdAt"),
      QueryHelper.limit(20),
    ]),
  ]);

  return {
    affiliateId,
    account,
    referrals: refRes.documents || [],
    commissions: comRes.documents || [],
  };
}

async function trackReferralOnSignup(referredUserId, refAffiliateId) {
  ensureDbConfigured();
  const affiliateIdInt = Number(refAffiliateId);
  if (!affiliateIdInt) return;

  // prevent duplicates
  const exists = await databases.listDocuments(DB_ID, AFFILIATE_REFERRALS_COLLECTION_ID, [
    QueryHelper.equal("referredUserId", referredUserId),
    QueryHelper.limit(1),
  ]);
  if ((exists.documents || []).length) return;

  const now = nowISO();
  const perms = [
    Permission.read(Role.user(referredUserId)),
    Permission.update(Role.user(referredUserId)),
    Permission.delete(Role.user(referredUserId)),
  ];

  await databases.createDocument(
    DB_ID,
    AFFILIATE_REFERRALS_COLLECTION_ID,
    IDHelper.unique(),
    {
      affiliateReferralId: Math.floor(Math.random() * 1000000),
      referrerAffiliateId: affiliateIdInt,
      referredUserId, // MUST be string column (recommended fix)
      referralDate: now,
      commissionEarned: 0,
      status: "registered",
    },
    perms
  );
}

// Commission on deposit (called from NOWPayments IPN)
export async function awardAffiliateCommissionOnDeposit({ userId, depositAmount }) {
  ensureDbConfigured();

  // find referral
  const refRes = await databases.listDocuments(DB_ID, AFFILIATE_REFERRALS_COLLECTION_ID, [
    QueryHelper.equal("referredUserId", userId),
    QueryHelper.limit(1),
  ]);
  const ref = (refRes.documents || [])[0];
  if (!ref) return null;

  const affiliateId = ref.referrerAffiliateId;
  if (!affiliateId) return null;

  // find affiliate account by affiliateId
  const accRes = await databases.listDocuments(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, [
    QueryHelper.equal("affiliateId", affiliateId),
    QueryHelper.limit(1),
  ]);
  const acc = (accRes.documents || [])[0];
  if (!acc) return null;

  const rate = Number(acc.commissionRate || 0);
  const commission = Math.max(0, (Number(depositAmount || 0) * rate) / 100);

  const now = nowISO();

  // create commission record
  await databases.createDocument(
    DB_ID,
    AFFILIATE_COMMISSIONS_COLLECTION_ID,
    IDHelper.unique(),
    {
      commissionId: IDHelper.unique(),
      affiliateId: String(affiliateId),
      walletId: "", // optional; set if you want
      commissionAmount: commission,
      commissionCurrency: "USD",
      commissionDate: now,
      paymentStatus: "pending",
    },
    [
      Permission.read(Role.user(acc.userId)),
      Permission.update(Role.user(acc.userId)),
      Permission.delete(Role.user(acc.userId)),
    ]
  );

  // update affiliate totals
  await databases.updateDocument(DB_ID, AFFILIATE_ACCOUNT_COLLECTION_ID, acc.$id, {
    totalEarned: Number(acc.totalEarned || 0) + commission,
    updatedAt: now,
  });

  return { commission, affiliateId };
}

// ---------- Bootstrap (single source of truth) ----------
export async function ensureUserBootstrap() {
  ensureDbConfigured();

  const user = await account.get();
  if (!user?.$id) throw new Error("Not authenticated");

  const profile = await createUserProfileIfMissing(user);
  await ensureWallets(user.$id);

  // Lock country once
  if (!profile.countryLocked) {
    const c = await detectCountryByIP();
    if (c) {
      await updateUserProfile(user.$id, { country: c, countryLocked: true });
    }
  }

  const wallets = await getUserWallets(user.$id);
  return { user, profile: await getUserProfile(user.$id), wallets };
}

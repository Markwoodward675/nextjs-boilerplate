"use client";

import {
  account,
  databases,
  DB_ID,
  USERS_COLLECTION_ID,
  WALLETS_COLLECTION_ID,
  QueryHelper,
  IDHelper,
  Permission,
  Role,
} from "./appwrite";

function ensureDbConfigured() {
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
  if (!USERS_COLLECTION_ID) throw new Error("USERS_COLLECTION_ID missing.");
  if (!WALLETS_COLLECTION_ID) throw new Error("WALLETS_COLLECTION_ID missing.");
}

function nowISO() {
  return new Date().toISOString();
}

function makeUsername(user) {
  const base =
    (user?.name || user?.email || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "user";
  return `${base}_${String(user?.$id || "").slice(0, 6)}`;
}

function safePatchFromExisting(existingDoc, patch) {
  const out = {};
  if (!existingDoc || typeof existingDoc !== "object") return out;
  Object.keys(patch || {}).forEach((k) => {
    // only update keys that already exist in the document to avoid schema errors
    if (Object.prototype.hasOwnProperty.call(existingDoc, k)) out[k] = patch[k];
  });
  return out;
}

/** AUTH **/
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
  return await account.createEmailPasswordSession(email, password);
}

export async function signUp(fullName, email, password) {
  // creates auth user
  const user = await account.create(IDHelper.unique(), email, password, fullName || "");
  // immediately login
  await signIn(email, password);
  // bootstrap documents
  const me = await account.get();
  await createUserProfileIfMissing(me, { fullName });
  await ensureWallets(me.$id);
  return me;
}

/** PROFILE **/
export async function getUserProfile(userId) {
  ensureDbConfigured();
  return await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userId);
}

export async function createUserProfileIfMissing(user, extra = {}) {
  ensureDbConfigured();
  const userId = user?.$id;
  if (!userId) throw new Error("Missing user.$id");

  try {
    return await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userId);
  } catch {
    // create with docId = userId
  }

  const now = nowISO();

  // IMPORTANT: match your user_profile schema keys (no unknown keys)
  const profileData = {
    userId: userId, // your schema: userId is string
    username: makeUsername(user),
    fullName: String(extra?.fullName || user?.name || ""),
    displayName: String(user?.name || ""),
    email: String(user?.email || ""),
    role: "user",

    // verification fields you already have
    verificationCode: "",
    verificationCodeExpiresAt: now,
    verificationCodeVerfied: false, // boolean (your schema key)

    // kyc status exists in your schema
    kycStatus: "not_submitted",

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
    userId,
    profileData,
    perms
  );
}

export async function updateUserProfile(userId, patch) {
  ensureDbConfigured();
  if (!userId) throw new Error("Missing userId");

  const existing = await getUserProfile(userId);
  const safePatch = safePatchFromExisting(existing, {
    ...patch,
    updatedAt: nowISO(),
  });

  if (Object.keys(safePatch).length === 0) return existing;

  return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, safePatch);
}

/** WALLETS (match your schema) **/
export async function getUserWallets(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, WALLETS_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

export async function ensureWallets(userId) {
  ensureDbConfigured();

  const existing = await getUserWallets(userId);
  if ((existing || []).length > 0) return existing;

  const now = nowISO();

  // Your wallets schema requires: walletId (string), userId (string), currencyType (enum), balance (double), isActive (boolean), createdDate (datetime), updatedDate (datetime)
  const mk = async (currencyType) => {
    const walletId = crypto?.randomUUID ? crypto.randomUUID() : IDHelper.unique();
    const data = {
      walletId: String(walletId),
      userId: String(userId),
      currencyType: currencyType, // must be one of enum values in Appwrite
      balance: 0,
      isActive: true,
      createdDate: now,
      updatedDate: now,
    };

    const perms = [
      Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];

    return await databases.createDocument(
      DB_ID,
      WALLETS_COLLECTION_ID,
      IDHelper.unique(),
      data,
      perms
    );
  };

  // IMPORTANT: your enum must include these exact values in Appwrite:
  // currencyType: main, trading, affiliate
  const created = await Promise.all([mk("main"), mk("trading"), mk("affiliate")]);
  return created;
}

/** TRANSACTIONS **/
export async function getUserTransactions(userId) {
  ensureDbConfigured();
  // If your transactions schema differs, this still returns user's rows
  const res = await databases.listDocuments(DB_ID, "transactions", [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

/** ALERTS **/
export async function getUserAlerts(userId) {
  ensureDbConfigured();
  const res = await databases.listDocuments(DB_ID, "alerts", [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

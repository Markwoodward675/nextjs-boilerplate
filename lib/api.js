"use client";

import {
  account,
  databases,
  storage,
  DB_ID,
  USERS_COLLECTION_ID,
  WALLETS_COLLECTION_ID,
  PROFILE_BUCKET_ID,
  KYC_BUCKET_ID,
  QueryHelper,
  IDHelper,
  Permission,
  Role,
} from "./appwrite";

function ensureDb() {
  if (!DB_ID) throw new Error("DB_ID is missing. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID.");
  if (!USERS_COLLECTION_ID) throw new Error("USERS_COLLECTION_ID missing.");
  if (!WALLETS_COLLECTION_ID) throw new Error("WALLETS_COLLECTION_ID missing.");
}

function ensureBuckets() {
  if (!PROFILE_BUCKET_ID) throw new Error("PROFILE_BUCKET_ID missing. Set NEXT_PUBLIC_APPWRITE_PROFILE_BUCKET_ID.");
  if (!KYC_BUCKET_ID) throw new Error("KYC_BUCKET_ID missing. Set NEXT_PUBLIC_APPWRITE_KYC_BUCKET_ID.");
}

const nowISO = () => new Date().toISOString();

function safePatch(existingDoc, patch) {
  // only update keys that already exist OR are explicitly present in the schema.
  // If you add new columns, they become safe automatically once the doc contains them.
  const out = {};
  if (!existingDoc || typeof existingDoc !== "object") return out;
  for (const [k, v] of Object.entries(patch || {})) {
    if (Object.prototype.hasOwnProperty.call(existingDoc, k)) out[k] = v;
  }
  return out;
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function signIn(email, password) {
  return await account.createEmailPasswordSession(email, password);
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {}
}

export async function getUserProfile(userId) {
  ensureDb();
  return await databases.getDocument(DB_ID, USERS_COLLECTION_ID, userId);
}

export async function updateUserProfile(userId, patch) {
  ensureDb();
  if (!userId) throw new Error("Missing userId");

  const existing = await getUserProfile(userId);
  const filtered = safePatch(existing, { ...patch, updatedAt: nowISO() });

  if (!Object.keys(filtered).length) return existing;

  return await databases.updateDocument(DB_ID, USERS_COLLECTION_ID, userId, filtered);
}

function getFileViewUrl(bucketId, fileId) {
  // Appwrite SDK doesn't directly return view URL from upload; we construct it from endpoint.
  // But in browser, simplest is to use storage.getFileView (returns a URL object-like)
  try {
    // storage.getFileView returns a URL instance in newer SDKs
    const u = storage.getFileView(bucketId, fileId);
    return String(u);
  } catch {
    return "";
  }
}

export async function uploadProfilePicture(userId, file) {
  ensureDb();
  ensureBuckets();
  if (!userId) throw new Error("Missing userId");
  if (!file) throw new Error("No file selected");

  const me = await getCurrentUser();
  if (!me) throw new Error("No active session");

  const profile = await getUserProfile(userId);

  // upload
  const created = await storage.createFile(PROFILE_BUCKET_ID, IDHelper.unique(), file, [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]);

  const fileId = created?.$id;
  const url = getFileViewUrl(PROFILE_BUCKET_ID, fileId);

  // update profile (requires you to add these columns)
  const updated = await updateUserProfile(userId, {
    profileImageFileId: fileId,
    profileImageUrl: url,
  });

  return updated;
}

export async function uploadKycDocument(userId, file) {
  ensureDb();
  ensureBuckets();
  if (!userId) throw new Error("Missing userId");
  if (!file) throw new Error("No file selected");

  const me = await getCurrentUser();
  if (!me) throw new Error("No active session");

  const profile = await getUserProfile(userId);

  const created = await storage.createFile(KYC_BUCKET_ID, IDHelper.unique(), file, [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]);

  const fileId = created?.$id;
  const fileName = file?.name || "document";

  // mark KYC as submitted/pending (requires your kycStatus column to accept this value)
  const updated = await updateUserProfile(userId, {
    kycDocFileId: fileId,
    kycDocFileName: fileName,
    kycStatus: "pending",
  });

  return updated;
}

// Wallet + transactions helpers used by other pages (keep your existing ones if you already have)
export async function getUserWallets(userId) {
  ensureDb();
  const res = await databases.listDocuments(DB_ID, WALLETS_COLLECTION_ID, [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

export async function getUserTransactions(userId) {
  ensureDb();
  const res = await databases.listDocuments(DB_ID, "transactions", [
    QueryHelper.equal("userId", userId),
    QueryHelper.limit(50),
  ]);
  return res?.documents || [];
}

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

export async function bootstrapUserCountry(userId) {
  ensureDb();
  if (!userId) return;

  const profile = await getUserProfile(userId);

  // already set & locked → do nothing
  if (profile?.country && profile?.countryLocked) return;

  const detected = await detectCountryByIP();
  if (!detected) return;

  return await updateUserProfile(userId, {
    country: detected,
    countryLocked: true,
  });
}

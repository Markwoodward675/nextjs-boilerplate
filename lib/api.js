// lib/api.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/** ---------------------------
 * Appwrite Client (Browser)
 * -------------------------- */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const COL_PROFILES = process.env.NEXT_PUBLIC_APPWRITE_COL_PROFILES || "profiles";
const COL_WALLETS = process.env.NEXT_PUBLIC_APPWRITE_COL_WALLETS || "wallets";
const COL_TX = process.env.NEXT_PUBLIC_APPWRITE_COL_TRANSACTIONS || "transactions";
const COL_ALERTS = process.env.NEXT_PUBLIC_APPWRITE_COL_ALERTS || "alerts";
const COL_AFF = process.env.NEXT_PUBLIC_APPWRITE_COL_AFFILIATE || "affiliate_accounts";
const BUCKET = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads";

function hardAssertEnv() {
  if (!ENDPOINT || !PROJECT_ID) throw new Error("Appwrite client env is missing.");
  if (!DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

const client = new Client();
const account = new Account(client);
let db;
let storage;

function init() {
  hardAssertEnv();
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  db = new Databases(client);
  storage = new Storage(client);
}

init();

/** ---------------------------
 * Errors
 * -------------------------- */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/** ---------------------------
 * Session / Auth
 * -------------------------- */
export async function signUp({ fullName, email, password, referralId = "" }) {
  const name = String(fullName || "").trim();
  const em = String(email || "").trim();
  const pw = String(password || "");

  if (!name) throw new Error("Full name is required.");
  if (!em) throw new Error("Email is required.");
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.");

  // create user + session
  const user = await account.create(ID.unique(), em, pw, name);
  await account.createEmailPasswordSession(em, pw);

  // bootstrap profile + wallets
  await ensureUserBootstrap(user);

  // persist referral (locked signup)
  if (referralId) {
    const boot = await ensureUserBootstrap();
    await updateUserProfile({ referralId: String(referralId) });
    await createAlert({
      title: "Referral captured",
      body: `Referral code applied: ${referralId}`,
      userId: boot.user.$id,
      kind: "referral",
    });
  }

  return user;
}

export async function signIn(email, password) {
  const em = String(email || "").trim();
  const pw = String(password || "");
  if (!em || !pw) throw new Error("Email and password are required.");
  await account.createEmailPasswordSession(em, pw);
  return true;
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
  return true;
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/** ---------------------------
 * Bootstrap (profiles + wallets)
 * -------------------------- */
export async function ensureUserBootstrap(userFromCall) {
  const user = userFromCall || (await getCurrentUser());
  if (!user?.$id) throw new Error("We couldn’t confirm your session. Please sign in again.");

  // profile
  let profile = await getUserProfile(user.$id).catch(() => null);
  if (!profile) {
    profile = await db.createDocument(DB_ID, COL_PROFILES, user.$id, {
      userId: user.$id,
      fullName: user.name || user.email?.split("@")?.[0] || "User",
      email: user.email || "",
      kycStatus: "not_submitted",
      verificationCodeVerified: false,
      avatarFileId: "",
      referralId: "",
      createdAt: new Date().toISOString(),
    });
  }

  // wallets (main, trading, affiliate, roi)
  await ensureWallet(user.$id, "main");
  await ensureWallet(user.$id, "trading");
  await ensureWallet(user.$id, "affiliate");
  await ensureWallet(user.$id, "roi");

  return { user, profile };
}

async function ensureWallet(userId, type) {
  const existing = await db
    .listDocuments(DB_ID, COL_WALLETS, [Query.equal("userId", userId), Query.equal("type", type), Query.limit(1)])
    .then((r) => r.documents?.[0])
    .catch(() => null);

  if (existing) return existing;

  return db.createDocument(DB_ID, COL_WALLETS, ID.unique(), {
    userId,
    type,
    balance: 0,
    currency: "USD",
    updatedAt: new Date().toISOString(),
  });
}

/** ---------------------------
 * Reads
 * -------------------------- */
export async function getUserProfile(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  return db.getDocument(DB_ID, COL_PROFILES, id);
}

export async function getUserWallets(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  const res = await db.listDocuments(DB_ID, COL_WALLETS, [Query.equal("userId", id), Query.limit(100)]);
  return res.documents || [];
}

export async function getUserTransactions(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  const res = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", id),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);
  return res.documents || [];
}

export async function getUserAlerts(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  const res = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", id),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  return res.documents || [];
}

/** ---------------------------
 * Writes
 * -------------------------- */
export async function createTransaction(payload) {
  const userId = String(payload?.userId || "").trim();
  if (!userId) throw new Error("Missing userId.");

  return db.createDocument(DB_ID, COL_TX, ID.unique(), {
    userId,
    type: payload.type || "unknown", // deposit/withdraw/invest/roi/affiliate/trade_intent/giftcard/etc
    amount: Number(payload.amount || 0),
    currency: payload.currency || "USD",
    status: payload.status || "pending",
    meta: payload.meta || {},
    createdAtISO: new Date().toISOString(),
  });
}

export async function createAlert({ userId, title, body, kind = "system" }) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  return db.createDocument(DB_ID, COL_ALERTS, ID.unique(), {
    userId: id,
    kind,
    title: String(title || "Notification"),
    body: String(body || ""),
    createdAtISO: new Date().toISOString(),
  });
}

export async function updateUserProfile(patch) {
  const boot = await ensureUserBootstrap();
  const docId = boot.user.$id;

  // IMPORTANT: no displayName here
  const safe = {
    ...(patch?.fullName ? { fullName: String(patch.fullName).trim() } : {}),
    ...(patch?.referralId ? { referralId: String(patch.referralId).trim() } : {}),
    ...(patch?.country ? { country: String(patch.country).trim() } : {}),
    ...(patch?.address ? { address: String(patch.address).trim() } : {}),
    updatedAt: new Date().toISOString(),
  };

  return db.updateDocument(DB_ID, COL_PROFILES, docId, safe);
}

/** ---------------------------
 * Uploads (profile + kyc)
 * -------------------------- */
export async function uploadProfilePicture(file) {
  const boot = await ensureUserBootstrap();
  if (!file) throw new Error("Select an image first.");

  const up = await storage.createFile(BUCKET, ID.unique(), file);
  await db.updateDocument(DB_ID, COL_PROFILES, boot.user.$id, {
    avatarFileId: up.$id,
    updatedAt: new Date().toISOString(),
  });

  await createAlert({
    userId: boot.user.$id,
    kind: "profile",
    title: "Profile picture updated",
    body: "Your profile picture has been uploaded successfully.",
  });

  return up.$id;
}

export async function uploadKycDocument({ front, back, selfie }) {
  const boot = await ensureUserBootstrap();

  if (!front || !back || !selfie) {
    throw new Error("Upload front, back, and selfie images.");
  }

  const f = await storage.createFile(BUCKET, ID.unique(), front);
  const b = await storage.createFile(BUCKET, ID.unique(), back);
  const s = await storage.createFile(BUCKET, ID.unique(), selfie);

  await db.updateDocument(DB_ID, COL_PROFILES, boot.user.$id, {
    kycFrontFileId: f.$id,
    kycBackFileId: b.$id,
    kycSelfieFileId: s.$id,
    kycStatus: "pending",
    updatedAt: new Date().toISOString(),
  });

  await createAlert({
    userId: boot.user.$id,
    kind: "kyc",
    title: "KYC submitted",
    body: "Your KYC documents have been submitted for review.",
  });

  return { front: f.$id, back: b.$id, selfie: s.$id };
}

/** ---------------------------
 * Affiliate
 * -------------------------- */
export async function ensureAffiliateAccount() {
  const boot = await ensureUserBootstrap();
  const userId = boot.user.$id;

  const existing = await db
    .listDocuments(DB_ID, COL_AFF, [Query.equal("userId", userId), Query.limit(1)])
    .then((r) => r.documents?.[0])
    .catch(() => null);

  if (existing) return existing;

  return db.createDocument(DB_ID, COL_AFF, ID.unique(), {
    userId,
    code: userId.slice(0, 8).toUpperCase(),
    clicks: 0,
    signups: 0,
    depositors: 0,
    commissionTotal: 0,
    createdAtISO: new Date().toISOString(),
  });
}

export async function getAffiliateSummary() {
  const boot = await ensureUserBootstrap();
  const acc = await ensureAffiliateAccount();
  const referralLink = `${window.location.origin}/signup?ref=${encodeURIComponent(acc.code)}`;

  // referred users = profiles where referralId == acc.code
  const referred = await db
    .listDocuments(DB_ID, COL_PROFILES, [Query.equal("referralId", acc.code), Query.limit(200)])
    .then((r) => r.documents || [])
    .catch(() => []);

  return { account: acc, referralLink, referred };
}

/** ---------------------------
 * Verify Code (email OTP via your API routes)
 * -------------------------- */
export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Unable to send verification code.");
  return true;
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id, code: c }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Invalid or expired code.");
  return true;
}

/** ---------------------------
 * Password recovery (Appwrite Recovery)
 * -------------------------- */
export async function requestPasswordRecovery(email, redirectUrl) {
  const em = String(email || "").trim();
  if (!em) throw new Error("Email is required.");

  // Appwrite requires a redirect URL (can be any URL under your platform in Appwrite settings)
  const url = String(redirectUrl || "").trim();
  if (!url) throw new Error("Missing redirect URL for recovery.");

  await account.createRecovery(em, url);
  return true;
}

export async function resetPasswordWithRecovery(userId, secret, newPassword) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pw = String(newPassword || "");
  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.");
  await account.updateRecovery(uid, sec, pw);
  return true;
}

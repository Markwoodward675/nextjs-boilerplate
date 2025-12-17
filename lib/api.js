// lib/api.js
"use client";

/**
 * Client-safe Appwrite API layer
 * - Browser auth uses `appwrite` SDK
 * - Server-only actions (Resend verify code) use Next API routes via fetch()
 */

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";
import { Client, Account, Databases, ID } from "appwrite";
/* -------------------------------- ENV -------------------------------- */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.APPWRITE_DATABASE_ID;

const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || process.env.APPWRITE_BUCKET_ID;

// Collections (support both your newer env names + older fallbacks)
const COL_PROFILES =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || // (some repos used this wrongly; keep it as fallback)
  "user_profile"; // default to your richer schema

const COL_WALLETS =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_COL_WALLETS ||
  "wallets";

const COL_TRANSACTIONS =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_COL_TRANSACTIONS ||
  "transactions";

const COL_ALERTS =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_COL_ALERTS ||
  "alerts";

const COL_VERIFY_CODES =
  process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  "verify_codes";

const COL_AFFILIATE_ACCOUNT =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_COL_AFFILIATE ||
  "affiliate_account";

const COL_AFFILIATE_REFERRALS =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_REFERRALS_COLLECTION_ID ||
  "affiliate_referrals";

const COL_AFFILIATE_COMMISSIONS =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID ||
  "affiliate_commissions";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

const PROFILES_COL =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  "profiles";

function must(value, name) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const client = new Client()
  .setEndpoint(must(ENDPOINT, "NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(must(PROJECT_ID, "NEXT_PUBLIC_APPWRITE_PROJECT_ID"));

const account = new Account(client);
const db = new Databases(client);

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

// --------- Sessions (support multiple SDK versions) ----------
export async function signIn(email, password) {
  const e = String(email || "").trim();
  const p = String(password || "");

  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error("Missing password.");

  const fn =
    account.createEmailPasswordSession ||
    account.createEmailSession ||
    account.createSession;

  if (typeof fn !== "function") {
    throw new Error("Appwrite session method not found on this SDK version.");
  }

  // createSession signature differs, but createEmailPasswordSession/createEmailSession are common.
  return await fn.call(account, e, p);
}

export async function signOut() {
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }
}

// --------- Bootstrap ----------
export async function getCurrentUser() {
  return await account.get();
}

export async function ensureUserBootstrap() {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.$id) throw new Error("Not signed in.");

  // ensure profile exists (docId = userId)
  let profile = null;
  try {
    profile = await db.getDocument(DB_ID, PROFILES_COL, user.$id);
  } catch {
    profile = await db.createDocument(DB_ID, PROFILES_COL, user.$id, {
      userId: user.$id,
      email: user.email,
      fullName: user.name || "",
      country: "",
      kycStatus: "not_submitted",
      verificationCodeVerified: false,
      createdAt: new Date().toISOString(),
      verifiedAt: "",
    });
  }

  return { user, profile };
}

// --------- Signup ----------
export async function signUp({ fullName, email, password, referralId = "" }) {
  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Missing full name.");
  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create Appwrite account
  await account.create(ID.unique(), e, p, name);

  // Create session immediately (so verify-code page can read session)
  await signIn(e, p);

  // Ensure profile exists (and store referral if you want later)
  await ensureUserBootstrap();

  return true;
}

// --------- Verify code (email via API routes) ----------
export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  const uid = String(userId || "").trim();
  const c = String(code || "").trim();

  if (!uid) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Verification failed.");
  return data;
}

// --------- Account status (server check by email) ----------
export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  const res = await fetch("/api/auth/account-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: e }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to check account.");
  return data; // { ok, exists, verified, userId }
}
/* ------------------------------ SDK SINGLETON ------------------------------ */

let _client = null;
let _account = null;
let _db = null;
let _storage = null;

function getSdk() {
  if (_client) return { client: _client, account: _account, db: _db, storage: _storage };

  // Do not throw during build; only throw when functions are called.
  if (ENDPOINT && PROJECT_ID) {
    _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    _account = new Account(_client);
    _db = new Databases(_client);
    _storage = new Storage(_client);
  }

  return { client: _client, account: _account, db: _db, storage: _storage };
}

function requireConfigured() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  if (!DB_ID) {
    throw new Error(
      "Appwrite database is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }
  const { account, db, storage } = getSdk();
  if (!account || !db || !storage) throw new Error("Appwrite SDK failed to initialize.");
  return { account, db, storage };
}

/* ------------------------------ HELPERS ------------------------------ */

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

function nowISO() {
  return new Date().toISOString();
}

function safeOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin || "";
}

function recoveryRedirectUrl() {
  // You can override this with NEXT_PUBLIC_APPWRITE_RECOVERY_URL if you want.
  const envUrl = process.env.NEXT_PUBLIC_APPWRITE_RECOVERY_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();

  // Prefer NEXT_PUBLIC_APP_URL (your domain)
  if (APP_URL && APP_URL.trim()) return `${APP_URL.replace(/\/+$/, "")}/reset-password`;

  // Fallback to browser origin
  const origin = safeOrigin();
  return origin ? `${origin}/reset-password` : "";
}

// Appwrite SDK compatibility (some installs expose different session method names)
async function createEmailSessionCompat(account, email, password) {
  if (typeof account?.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  if (typeof account?.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  // Older SDKs sometimes had createSession(email,password)
  if (typeof account?.createSession === "function") {
    return account.createSession(email, password);
  }
  throw new Error("Email session method not found in Appwrite SDK. Update `appwrite` package.");
}

function uuid36() {
  // walletId / transactionId in your schema are size 36
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback (not perfect, but 36-ish)
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/* ------------------------------ AUTH ------------------------------ */

export async function signUp(a, b, c) {
  const { account } = requireConfigured();

  // Accept both:
  // signUp({ fullName, email, password, referralId })
  // signUp(email, password, fullName)
  let email, password, fullName, referralId;
  if (a && typeof a === "object") {
    email = a.email;
    password = a.password;
    fullName = a.fullName;
    referralId = a.referralId || a.ref || "";
  } else {
    email = a;
    password = b;
    fullName = c;
    referralId = "";
  }

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  const n = String(fullName || "").trim();

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  const user = await account.create(ID.unique(), e, p, n || undefined);

  // Create session immediately (verify-code page needs a session)
  await createEmailSessionCompat(account, e, p);

  // Bootstrap documents
  await ensureUserBootstrap({ referrerAffiliateId: referralId ? Number(referralId) || null : null });

  return user;
}

export async function signIn(email, password) {
  const { account } = requireConfigured();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  await createEmailSessionCompat(account, e, p);
  return true;
}

export async function signOut() {
  const { account } = requireConfigured();
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
  return true;
}

export async function getCurrentUser() {
  const { account } = requireConfigured();
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/* ------------------------------ PASSWORD RECOVERY ------------------------------ */

export async function requestPasswordRecovery(email, redirectUrl) {
  const { account } = requireConfigured();
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const url = String(redirectUrl || "").trim() || recoveryRedirectUrl();
  if (!url) throw new Error("Missing redirect URL for recovery.");

  return account.createRecovery(e, url);
}

// Alias some pages might use
export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  return resetPasswordWithRecovery(userId, secret, password, passwordAgain);
}

export async function resetPasswordWithRecovery(userId, secret, password, passwordAgain) {
  const { account } = requireConfigured();
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1) throw new Error('Missing required parameter: "password"');
  if (p2 && p1 !== p2) throw new Error("Passwords do not match.");

  return account.updateRecovery(uid, sec, p1, p2 || p1);
}

/* ------------------------------ PROFILES + BOOTSTRAP ------------------------------ */

async function findProfileDoc(db, userId) {
  // Try docId=userId first
  try {
    return await db.getDocument(DB_ID, COL_PROFILES, userId);
  } catch {
    // fallback to query by userId field
    try {
      const res = await db.listDocuments(DB_ID, COL_PROFILES, [Query.equal("userId", userId), Query.limit(1)]);
      return res?.documents?.[0] || null;
    } catch {
      return null;
    }
  }
}

async function safeUpdateProfile(db, docId, data) {
  // Try updating; if schema rejects a field, we’ll retry with a minimal safe set.
  try {
    return await db.updateDocument(DB_ID, COL_PROFILES, docId, data);
  } catch (e) {
    // Minimal set that matches both `profiles` and `user_profile` schemas
    const minimal = {
      ...(data.userId ? { userId: data.userId } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(typeof data.fullName === "string" ? { fullName: data.fullName } : {}),
      ...(typeof data.country === "string" ? { country: data.country } : {}),
      ...(typeof data.address === "string" ? { address: data.address } : {}),
      ...(typeof data.kycStatus === "string" ? { kycStatus: data.kycStatus } : {}),
      ...(typeof data.verificationCodeVerified === "boolean"
        ? { verificationCodeVerified: data.verificationCodeVerified }
        : {}),
      ...(typeof data.verifiedAt === "string" ? { verifiedAt: data.verifiedAt } : {}),
      ...(typeof data.createdAt === "string" ? { createdAt: data.createdAt } : {}),
      ...(typeof data.updatedAt === "string" ? { updatedAt: data.updatedAt } : {}),
      // if your user_profile has these, keep them
      ...(typeof data.profileImageFileId === "string" ? { profileImageFileId: data.profileImageFileId } : {}),
      ...(typeof data.profileImageUrl === "string" ? { profileImageUrl: data.profileImageUrl } : {}),
      ...(typeof data.kycDocFileId === "string" ? { kycDocFileId: data.kycDocFileId } : {}),
      ...(typeof data.kycDocFileName === "string" ? { kycDocFileName: data.kycDocFileName } : {}),
      ...(typeof data.referrerAffiliateId === "number" ? { referrerAffiliateId: data.referrerAffiliateId } : {}),
    };

    try {
      return await db.updateDocument(DB_ID, COL_PROFILES, docId, minimal);
    } catch {
      throw e;
    }
  }
}

export async function ensureUserBootstrap({ referrerAffiliateId } = {}) {
  const { db } = requireConfigured();
  const user = await getCurrentUser();
  if (!user?.$id) throw new Error("Not signed in.");

  const userId = user.$id;

  let profile = await findProfileDoc(db, userId);

  if (!profile) {
    // Create with docId=userId to keep it consistent
    const payload = {
      userId,
      email: user.email || null,
      fullName: user.name || null,
      country: null,
      address: null,
      kycStatus: "not_submitted",
      verificationCodeVerified: false,
      createdAt: nowISO(),
      verifiedAt: null,
      updatedAt: nowISO(),
      ...(typeof referrerAffiliateId === "number" && !Number.isNaN(referrerAffiliateId)
        ? { referrerAffiliateId }
        : {}),
    };

    try {
      profile = await db.createDocument(DB_ID, COL_PROFILES, userId, payload);
    } catch {
      // Some collections require ID.unique() instead of custom IDs
      profile = await db.createDocument(DB_ID, COL_PROFILES, ID.unique(), payload);
    }
  } else if (typeof referrerAffiliateId === "number" && !Number.isNaN(referrerAffiliateId)) {
    // Lock referral if not already set
    try {
      if (profile.referrerAffiliateId == null) {
        profile = await safeUpdateProfile(db, profile.$id || userId, {
          referrerAffiliateId,
          countryLocked: true,
          updatedAt: nowISO(),
        });
      }
    } catch {
      // ignore
    }
  }

  // Ensure wallets exist (soft-fail if your schema differs)
  let wallets = [];
  try {
    wallets = await getUserWallets(userId);
    if (!wallets?.length) {
      await ensureDefaultWallets(userId);
      wallets = await getUserWallets(userId);
    }
  } catch {
    wallets = [];
  }

  return { user, profile, wallets };
}

// Some code paths pass a user object; keep this alias.
export async function ensureUserBootstrapWithUser() {
  return ensureUserBootstrap();
}

export async function getUserProfile(userId) {
  const { db } = requireConfigured();
  const uid = String(userId || "").trim();
  if (!uid) {
    const me = await getCurrentUser();
    if (!me?.$id) return null;
    return findProfileDoc(db, me.$id);
  }
  return findProfileDoc(db, uid);
}

export async function updateUserProfile(payload = {}) {
  const { db } = requireConfigured();
  const boot = await ensureUserBootstrap();
  const docId = boot.profile?.$id || boot.user?.$id;
  if (!docId) throw new Error("Missing profile document.");

  // IMPORTANT: DO NOT write `displayName` (this caused schema errors in your Settings).
  // Use `fullName` only.
  const next = {
    ...(payload.fullName != null ? { fullName: String(payload.fullName || "").trim() } : {}),
    ...(payload.country != null ? { country: String(payload.country || "").trim() } : {}),
    ...(payload.address != null ? { address: String(payload.address || "").trim() } : {}),
    ...(payload.websiteUrl != null ? { websiteUrl: String(payload.websiteUrl || "").trim() } : {}),
    ...(payload.bio != null ? { bio: String(payload.bio || "").trim() } : {}),
    ...(payload.kycStatus != null ? { kycStatus: String(payload.kycStatus || "").trim() } : {}),
    updatedAt: nowISO(),
  };

  const updated = await safeUpdateProfile(db, docId, next);
  return updated;
}

/* ------------------------------ UPLOADS ------------------------------ */

function fileViewUrl(fileId) {
  // Works without calling SDK methods and avoids server-side URL generation.
  if (!ENDPOINT || !PROJECT_ID || !BUCKET_ID) return "";
  return `${ENDPOINT}/storage/buckets/${encodeURIComponent(BUCKET_ID)}/files/${encodeURIComponent(
    fileId
  )}/view?project=${encodeURIComponent(PROJECT_ID)}`;
}

export async function uploadProfilePicture(file) {
  const { storage, db } = requireConfigured();
  const boot = await ensureUserBootstrap();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");

  if (!file) throw new Error("Please select a profile picture.");
  const created = await storage.createFile(BUCKET_ID, ID.unique(), file);
  const fileId = created?.$id;

  const url = fileId ? fileViewUrl(fileId) : "";

  // Try to store in user_profile fields; if schema doesn’t allow, this will fallback safely.
  const docId = boot.profile?.$id || boot.user?.$id;
  await safeUpdateProfile(db, docId, {
    profileImageFileId: fileId,
    profileImageUrl: url || null,
    updatedAt: nowISO(),
  });

  return { fileId, url };
}

// Accept either a single doc OR (front, back, selfie)
export async function uploadKycDocument({ front, back, selfie, file } = {}) {
  const { storage, db } = requireConfigured();
  const boot = await ensureUserBootstrap();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");

  const docId = boot.profile?.$id || boot.user?.$id;

  const uploads = [];
  const add = async (f) => {
    if (!f) return null;
    const created = await storage.createFile(BUCKET_ID, ID.unique(), f);
    return created?.$id || null;
  };

  const frontId = await add(front);
  const backId = await add(back);
  const selfieId = await add(selfie);
  const singleId = await add(file);

  // Best effort store (depends on what columns you actually have)
  // - If you created kycFrontFileId/kycBackFileId/kycSelfieFileId columns, they’ll be saved.
  // - Otherwise we store a JSON string into kycDocFileId as a fallback.
  const composite = {
    frontFileId: frontId,
    backFileId: backId,
    selfieFileId: selfieId,
    fileId: singleId,
  };

  const payload = {
    kycStatus: "pending",
    updatedAt: nowISO(),
  };

  // Try rich fields first
  try {
    await safeUpdateProfile(db, docId, {
      ...payload,
      ...(frontId ? { kycFrontFileId: frontId } : {}),
      ...(backId ? { kycBackFileId: backId } : {}),
      ...(selfieId ? { kycSelfieFileId: selfieId } : {}),
      ...(singleId ? { kycDocFileId: singleId, kycDocFileName: file?.name || null } : {}),
    });
  } catch {
    // Fallback to packing into kycDocFileId if strict schema blocks extra fields
    await safeUpdateProfile(db, docId, {
      ...payload,
      kycDocFileId: JSON.stringify(composite),
      kycDocFileName: "kyc_bundle.json",
    });
  }

  // Optional: create an alert
  try {
    await createAlert({
      userId: boot.user.$id,
      title: "KYC submitted",
      body: "Your KYC documents have been submitted for review.",
      severity: "medium",
      kind: "kyc",
    });
  } catch {
    // ignore
  }

  return composite;
}

/* ------------------------------ WALLETS ------------------------------ */

async function ensureDefaultWallets(userId) {
  const { db } = requireConfigured();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const createdDate = new Date().toISOString();

  const make = async () => {
    const walletId = uuid36();
    return db.createDocument(DB_ID, COL_WALLETS, ID.unique(), {
      walletId,
      userId: uid,
      currencyType: "USD", // your enum allows USD/EUR/JPY/GBP; keep simple
      balance: 0,
      isActive: true,
      createdDate,
      updatedDate: createdDate,
    });
  };

  // Try creating 3 wallets; ignore if schema or perms block it
  try {
    await Promise.all([make(), make(), make()]);
  } catch {
    // ignore
  }
}

export async function getUserWallets(userId) {
  const { db } = requireConfigured();
  const uid = String(userId || "").trim() || (await getCurrentUser())?.$id;
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);

  return res?.documents || [];
}

/* ------------------------------ TRANSACTIONS ------------------------------ */

export async function getUserTransactions(userId, limit = 200) {
  const { db } = requireConfigured();
  const uid = String(userId || "").trim() || (await getCurrentUser())?.$id;
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_TRANSACTIONS, [
    Query.equal("userId", uid),
    Query.orderDesc("transactionDate"),
    Query.limit(Math.max(1, Math.min(500, Number(limit) || 200))),
  ]);

  return res?.documents || [];
}

export async function createTransaction(payload = {}) {
  const { db } = requireConfigured();

  const me = await getCurrentUser();
  const userId = String(payload.userId || payload.profileUserUuid || me?.$id || "").trim();
  if (!userId) throw new Error("Missing userId.");

  const walletId = String(payload.walletId || "").trim();
  if (!walletId) throw new Error("Missing walletId.");

  const amount = Number(payload.amount || 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount.");

  const currencyType = String(payload.currencyType || "USD");
  const transactionType = String(payload.transactionType || "deposit");

  const meta =
    payload.meta != null
      ? typeof payload.meta === "string"
        ? payload.meta
        : JSON.stringify(payload.meta)
      : (payload.extra != null ? JSON.stringify(payload.extra) : " ");

  const doc = {
    transactionId: uuid36(),
    userId,
    walletId,
    amount,
    currencyType, // USD/EUR/JPY/GBP
    transactionType, // deposit/withdraw/... (your enum)
    transactionDate: payload.transactionDate || nowISO(),
    status: payload.status || "pending",
    meta: meta || " ",
    type: payload.type || payload.kind || " ",
  };

  return db.createDocument(DB_ID, COL_TRANSACTIONS, ID.unique(), doc);
}

/* ------------------------------ ALERTS ------------------------------ */

export async function getUserAlerts(userId, limit = 100) {
  const { db } = requireConfigured();
  const uid = String(userId || "").trim() || (await getCurrentUser())?.$id;
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.max(1, Math.min(200, Number(limit) || 100))),
  ]);

  return res?.documents || [];
}

export async function createAlert(payloadOrUserId, title, body) {
  const { db } = requireConfigured();

  // Accept:
  // createAlert({ userId, title, body, severity, kind })
  // createAlert(userId, title, body)
  let userId, t, b, severity, kind;
  if (payloadOrUserId && typeof payloadOrUserId === "object") {
    userId = payloadOrUserId.userId;
    t = payloadOrUserId.title || payloadOrUserId.alertTitle;
    b = payloadOrUserId.body || payloadOrUserId.alertMessage;
    severity = payloadOrUserId.severity || "low";
    kind = payloadOrUserId.kind || payloadOrUserId.alertCategory || null;
  } else {
    userId = payloadOrUserId;
    t = title;
    b = body;
    severity = "low";
    kind = null;
  }

  const me = await getCurrentUser();
  const uid = String(userId || me?.$id || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const alertTitle = String(t || "").trim() || "Notification";
  const alertMessage = String(b || "").trim() || " ";

  // Your alerts schema has BOTH (alertTitle/alertMessage) and (title/body) required.
  const doc = {
    alertId: uuid36(),
    alertTitle,
    alertMessage,
    severity, // low/medium/high/critical
    alertCategory: kind,
    userId: uid,
    isResolved: false,
    title: alertTitle,
    body: alertMessage,
    createdAt: nowISO(),
  };

  return db.createDocument(DB_ID, COL_ALERTS, ID.unique(), doc);
}

/* ------------------------------ AFFILIATE ------------------------------ */

export async function ensureAffiliateAccount(appwriteUserId) {
  const { db } = requireConfigured();
  const me = await getCurrentUser();
  const uid = String(appwriteUserId || me?.$id || "").trim();
  if (!uid) throw new Error("Missing userId.");

  // find existing
  const existing = await db
    .listDocuments(DB_ID, COL_AFFILIATE_ACCOUNT, [Query.equal("userId", uid), Query.limit(1)])
    .then((r) => r?.documents?.[0] || null)
    .catch(() => null);

  if (existing) return existing;

  const affiliateId = Math.floor(100000 + Math.random() * 900000);
  const joinDate = nowISO();

  return db.createDocument(DB_ID, COL_AFFILIATE_ACCOUNT, ID.unique(), {
    commissionRate: 5, // %
    totalEarned: 0,
    lastPaymentDate: null,
    joinDate,
    status: "active",
    userId: uid,
    affiliateId,
  });
}

export async function getAffiliateSummary(appwriteUserId, limit = 25) {
  const { db } = requireConfigured();
  const acc = await ensureAffiliateAccount(appwriteUserId);

  const affiliateId = acc?.affiliateId;

  const commissions = await db
    .listDocuments(DB_ID, COL_AFFILIATE_COMMISSIONS, [
      Query.equal("userId", String(appwriteUserId || acc.userId)),
      Query.orderDesc("commissionDate"),
      Query.limit(Math.max(1, Math.min(200, Number(limit) || 25))),
    ])
    .then((r) => r?.documents || [])
    .catch(() => []);

  const referrals =
    affiliateId != null
      ? await db
          .listDocuments(DB_ID, COL_AFFILIATE_REFERRALS, [
            Query.equal("referrerAffiliateId", Number(affiliateId)),
            Query.orderDesc("$createdAt"),
            Query.limit(Math.max(1, Math.min(200, Number(limit) || 25))),
          ])
          .then((r) => r?.documents || [])
          .catch(() => [])
      : [];

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${encodeURIComponent(String(affiliateId || ""))}`
      : "";

  return { affiliateId, accountDoc: acc, commissions, referrals, referralLink };
}

// Some pages used this name:
export async function getAffiliateOverview(appwriteUserId, limit = 25) {
  return getAffiliateSummary(appwriteUserId, limit);
}

/* ------------------------------ VERIFY CODE (via API routes) ------------------------------ */

export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id, code: c }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Invalid or expired code.");
  return true;
}

/* ------------------------------ LEGACY EXPORTS (keep old imports working) ------------------------------ */

export const loginWithEmailPassword = async (email, password) => signIn(email, password);
export const registerUser = async (payload) => signUp(payload);
export const logoutUser = async () => signOut();

export async function resendVerificationEmail() {
  // Your flow is OTP via /api/auth/send-verify-code, so keep this harmless.
  return true;
}

// Helpful namespace (some files do `import * as api from ...`)
export const api = {
  getErrorMessage,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  ensureUserBootstrap,
  ensureUserBootstrapWithUser,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  uploadKycDocument,
  getUserWallets,
  getUserTransactions,
  createTransaction,
  getUserAlerts,
  createAlert,
  ensureAffiliateAccount,
  getAffiliateSummary,
  getAffiliateOverview,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  requestPasswordRecovery,
  resetPasswordWithRecovery,
  completePasswordRecovery,
  loginWithEmailPassword,
  registerUser,
  logoutUser,
  resendVerificationEmail,
};

export { ID, Query };

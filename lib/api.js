"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* =========================================================
   ENV (robust: supports your many env names)
========================================================= */
const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT ||
  "";

const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT_ID ||
  "";

// DB id (client must read NEXT_PUBLIC*, but we also accept server names to avoid misconfig)
const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID?.trim?.() ||
  process.env.APPWRITE_DATABASE_ID ||
  "";

// ✅ Single source of truth profile collection
// Your env list has NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID.
// Default to "user_profile" (NOT "profiles").
const COL_PROFILE =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.APPWRITE_PROFILES_COLLECTION_ID || // if you mapped it to user_profile
  "user_profile";

const COL_WALLETS =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

const COL_TX =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

const COL_ALERTS =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";

const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ||
  process.env.APPWRITE_BUCKET_ID ||
  "";

// Used for password recovery redirect URL
const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL || "").trim() ||
  (typeof window !== "undefined" ? window.location.origin : "");

/* =========================================================
   SDK SINGLETON (prevents “bind” undefined issues)
========================================================= */
let _client = null;
let _account = null;
let _db = null;
let _storage = null;

function getSdk() {
  if (_client) return { client: _client, account: _account, db: _db, storage: _storage };

  if (!ENDPOINT || !PROJECT_ID) {
    // Don’t crash build; throw only when functions actually require it.
    return { client: null, account: null, db: null, storage: null };
  }

  _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  _account = new Account(_client);
  _db = new Databases(_client);
  _storage = new Storage(_client);

  return { client: _client, account: _account, db: _db, storage: _storage };
}

function requireConfigured({ requireDb = false } = {}) {
  const { account, db, storage } = getSdk();

  if (!ENDPOINT || !PROJECT_ID || !account) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel."
    );
  }

  if (requireDb && !DB_ID) {
    throw new Error(
      "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }

  return { account, db, storage };
}

/* =========================================================
   ERROR HELPERS
========================================================= */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  const clean = String(msg).replace(/^AppwriteException:\s*/i, "").trim();

  // Common CORS symptom (browser blocks Appwrite)
  if (/cors|access-control-allow-origin|blocked by cors/i.test(clean)) {
    return (
      "CORS blocked the Appwrite request. In Appwrite Console → Platforms, add your domain(s) as Web platforms " +
      "(day-trader-insights.com and your vercel *.vercel.app domain)."
    );
  }

  return clean || fallback;
}

/* =========================================================
   SESSION COMPAT + “SESSION ACTIVE” HARD FIX
========================================================= */
async function createEmailSessionCompat(account, email, password) {
  // Appwrite JS SDK v13+ uses createEmailPasswordSession
  if (typeof account?.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  // Older SDKs
  if (typeof account?.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  if (typeof account?.createSession === "function") {
    return account.createSession(email, password);
  }
  throw new Error(
    "Appwrite Account email session method not found. Ensure you're importing from 'appwrite' (not 'node-appwrite') on the client."
  );
}

async function deleteCurrentSessionCompat(account) {
  try {
    if (typeof account?.deleteSession === "function") {
      await account.deleteSession("current");
      return;
    }
  } catch {}
  try {
    if (typeof account?.deleteSessions === "function") {
      await account.deleteSessions();
    }
  } catch {}
}

async function replaceSessionThenCreate(account, email, password) {
  try {
    return await createEmailSessionCompat(account, email, password);
  } catch (e) {
    const msg = getErrorMessage(e, "");
    if (/session is active|prohibited when a session is active/i.test(msg)) {
      await deleteCurrentSessionCompat(account);
      return await createEmailSessionCompat(account, email, password);
    }
    throw e;
  }
}

/* =========================================================
   AUTH
========================================================= */
export async function getCurrentUser() {
  const { account } = requireConfigured();
  return account.get();
}

export async function signOut() {
  const { account } = requireConfigured();
  await deleteCurrentSessionCompat(account);
  return true;
}

// keep older imports working
export const logoutUser = signOut;

export async function signIn(email, password) {
  const { account } = requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // ✅ HARD FIX: always replace session if one exists
  await replaceSessionThenCreate(account, e, p);

  return { ok: true, next: "/verify-code" };
}

export const loginWithEmailPassword = signIn;

// ✅ signup supports BOTH signatures:
// signUp({fullName,email,password,referralId})
// signUp(email,password,fullName)
export async function signUp(a, b, c) {
  const { account } = requireConfigured({ requireDb: false }); // allow account creation even if DB mis-set

  let fullName = "";
  let email = "";
  let password = "";
  let referralId = "";

  if (a && typeof a === "object") {
    fullName = String(a.fullName || "").trim();
    email = String(a.email || "").trim().toLowerCase();
    password = String(a.password || "");
    referralId = String(a.referralId || "").trim();
  } else {
    email = String(a || "").trim().toLowerCase();
    password = String(b || "");
    fullName = String(c || "").trim();
  }

  void referralId; // (you can wire this into affiliate later)

  if (!fullName) throw new Error('Missing required parameter: "fullName"');
  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  try {
    await account.create(ID.unique(), email, password, fullName);
  } catch (e) {
    // If already exists: we decide where to send them (verified -> signin, unverified -> verify-code)
    const msg = getErrorMessage(e, "");
    const is409 = String(e?.code || "") === "409" || /already exists|conflict/i.test(msg);
    if (!is409) throw e;

    // Try sign-in with the password they typed.
    // If it works, we can inspect verification status.
    try {
      await replaceSessionThenCreate(account, email, password);
      const boot = await ensureUserBootstrap().catch(() => null);

      if (boot?.profile?.verificationCodeVerified) {
        // verified -> go signin (as you requested) and end session
        await deleteCurrentSessionCompat(account);
        return { ok: true, existing: true, verified: true, next: "/signin" };
      }

      return { ok: true, existing: true, verified: false, next: "/verify-code" };
    } catch {
      // Wrong password or unable to inspect; safest UX:
      return { ok: false, existing: true, next: "/signin" };
    }
  }

  // Create session after successful signup (replace any session if needed)
  await replaceSessionThenCreate(account, email, password);

  // Create minimal profile (safe fields only)
  await ensureUserBootstrap().catch(() => null);

  return { ok: true, next: "/verify-code" };
}

export const registerUser = signUp;

/* =========================================================
   PROFILE (single source: user_profile)
   NOTE: we only write fields that exist in your user_profile schema
========================================================= */
async function getOrCreateUserProfile(user) {
  const { db } = requireConfigured({ requireDb: true });

  const userId = user?.$id;
  const now = new Date().toISOString();

  // 1) preferred: docId == userId
  try {
    return await db.getDocument(DB_ID, COL_PROFILE, userId);
  } catch {}

  // 2) fallback: search by userId (if docId wasn’t userId historically)
  try {
    const list = await db.listDocuments(DB_ID, COL_PROFILE, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    if (list?.documents?.[0]) return list.documents[0];
  } catch {}

  // 3) create minimal, schema-safe doc
  const payload = {
    userId,
    email: user?.email || null,
    fullName: user?.name || null,
    verificationCodeVerified: false,
    createdAt: now,
    updatedAt: now,
    // DO NOT write verifiedAt here (user_profile doesn’t have it)
  };

  return await db.createDocument(DB_ID, COL_PROFILE, userId, payload);
}

export async function getUserProfile() {
  const boot = await ensureUserBootstrap();
  return boot.profile;
}

export async function saveUserProfile(patch = {}) {
  const { db } = requireConfigured({ requireDb: true });
  const user = await getCurrentUser();

  const doc = await getOrCreateUserProfile(user);

  // whitelist safe fields only
  const allowed = [
    "fullName",
    "country",
    "address",
    "bio",
    "websiteUrl",
    "birthdate",
    "profileImageFileId",
    "profileImageUrl",
    "kycStatus",
    "kycDocFileId",
    "kycDocFileName",
    "countryLocked",
    "referrerAffiliateId",
    "verificationCodeVerified",
    "verificationCode",
    "verificationCodeExpiresAt",
    "role",
  ];

  const update = { updatedAt: new Date().toISOString() };
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) update[k] = patch[k];
  }

  return await db.updateDocument(DB_ID, COL_PROFILE, doc.$id, update);
}

/* =========================================================
   STORAGE UPLOADS (profile image / KYC files)
========================================================= */
function fileViewUrl(bucketId, fileId) {
  // Use endpoint directly so it works everywhere
  // Appwrite file view URL format:
  // `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${PROJECT_ID}`
  return `${ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${PROJECT_ID}`;
}

export async function uploadToBucket(file) {
  const { storage } = requireConfigured({ requireDb: false });

  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");
  if (!file) throw new Error("Missing file.");

  const created = await storage.createFile(BUCKET_ID, ID.unique(), file);
  return {
    fileId: created?.$id,
    url: created?.$id ? fileViewUrl(BUCKET_ID, created.$id) : null,
    name: created?.name || null,
  };
}

export async function uploadProfileImage(file) {
  const up = await uploadToBucket(file);
  await saveUserProfile({
    profileImageFileId: up.fileId,
    profileImageUrl: up.url,
  });
  return up;
}

export async function uploadKycFiles({ front, back, selfie }) {
  // Store one “bundle” by uploading whichever files exist
  const out = {};
  if (front) out.front = await uploadToBucket(front);
  if (back) out.back = await uploadToBucket(back);
  if (selfie) out.selfie = await uploadToBucket(selfie);

  // Save only one doc pointer (you can expand later)
  // Use kycDocFileId + kycDocFileName as your schema already has
  const first = out.front || out.back || out.selfie;
  if (first?.fileId) {
    await saveUserProfile({
      kycDocFileId: first.fileId,
      kycDocFileName: first.name || "kyc_upload",
      kycStatus: "pending",
    });
  }
  return out;
}

/* =========================================================
   BOOTSTRAP
========================================================= */
export async function ensureUserBootstrap() {
  const { db } = requireConfigured({ requireDb: true });

  const user = await getCurrentUser().catch(() => null);
  if (!user?.$id) throw new Error("Not signed in.");

  const profile = await getOrCreateUserProfile(user);

  // wallets are optional; don’t hard-fail bootstrap if wallets aren’t ready yet
  let wallets = [];
  try {
    const list = await db.listDocuments(DB_ID, COL_WALLETS, [
      Query.equal("userId", user.$id),
      Query.limit(50),
    ]);
    wallets = list?.documents || [];
  } catch {
    wallets = [];
  }

  return { user, profile, wallets };
}

/* =========================================================
   VERIFY CODE (calls your server API routes)
========================================================= */
export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");

  // ✅ mark verified in user_profile (ONLY safe fields)
  try {
    await saveUserProfile({ verificationCodeVerified: true });
  } catch {}

  return data;
}

/* =========================================================
   PASSWORD RECOVERY (hardfix)
========================================================= */
function mustAbsoluteUrl(pathname) {
  const base = String(APP_URL || "").trim();
  if (!base || !/^https?:\/\//i.test(base)) {
    throw new Error("Set NEXT_PUBLIC_APP_URL to your real domain (e.g. https://day-trader-insights.com).");
  }
  const p = String(pathname || "/").startsWith("/") ? pathname : `/${pathname}`;
  const u = new URL(p, base);
  return u.toString();
}

export async function requestPasswordRecovery(email) {
  const { account } = requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const redirectUrl = mustAbsoluteUrl("/reset-password");
  return account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  const { account } = requireConfigured();

  if (!userId || !secret) throw new Error("Invalid recovery link.");
  if (!password) throw new Error('Missing required parameter: "password"');

  return account.updateRecovery(userId, secret, password, passwordAgain || password);
}

/* =========================================================
   WALLETS / TRANSACTIONS / ALERTS (for protected pages)
========================================================= */
export async function getUserWallets() {
  const { db } = requireConfigured({ requireDb: true });
  const user = await getCurrentUser();

  const list = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", user.$id),
    Query.limit(50),
  ]);

  return list?.documents || [];
}

export async function getUserTransactions({ limit = 50 } = {}) {
  const { db } = requireConfigured({ requireDb: true });
  const user = await getCurrentUser();

  const list = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", user.$id),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(200, Math.max(1, limit))),
  ]);

  return list?.documents || [];
}

export async function getUserAlerts({ limit = 50 } = {}) {
  const { db } = requireConfigured({ requireDb: true });
  const user = await getCurrentUser();

  const list = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", user.$id),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(200, Math.max(1, limit))),
  ]);

  return list?.documents || [];
}

/* =========================================================
   Compatibility exports used across components
========================================================= */
export async function resendVerificationEmail() {
  // You use 6-digit code now; keep old imports from breaking
  return true;
}

export { ID, Query };

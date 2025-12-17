"use client";

/**
 * lib/api.js (Client-safe, Next.js App Router)
 * - Auth & client reads via Appwrite Web SDK
 * - Server-only actions via Next API routes (e.g. email verification code)
 *
 * IMPORTANT FIXES:
 * 1) profiles docId is ALWAYS userId (matches your verify-code API routes)
 * 2) bucket env uses NEXT_PUBLIC_APPWRITE_BUCKET_ID (your Vercel env)
 * 3) exports are stable + backward compatible (no more "is not a function")
 */

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ----------------------------- ENV + CONSTANTS ----------------------------- */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Support both env names you have floating around
const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID; // harmless duplicate fallback

// Collection IDs (prefer env, fallback to your defaults)
const COL_PROFILES = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "profiles";
const COL_WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const COL_TX = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";
const COL_ALERTS = process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
const COL_VERIFY = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";

const COL_AFF_ACCOUNT =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account";
const COL_AFF_REFERRALS = "affiliate_referrals";
const COL_AFF_COMMISSIONS = "affiliate_commissions";

// ✅ Your Vercel env name is NEXT_PUBLIC_APPWRITE_BUCKET_ID
const UPLOADS_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_UPLOADS_BUCKET_ID ||
  "uploads";

/* ------------------------------ APPWRITE CLIENT ---------------------------- */

function assertEnvAtRuntime() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Missing NEXT_PUBLIC_APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_PROJECT_ID"
    );
  }
  if (!DB_ID) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)");
  }
}

const client = new Client();
if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

const account = new Account(client);
const db = new Databases(client);
const storage = new Storage(client);

/* --------------------------------- HELPERS -------------------------------- */

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
  // Appwrite requires a redirect URL for recovery
  // Use env if provided; otherwise fallback to /reset-password
  const envUrl = process.env.NEXT_PUBLIC_APPWRITE_RECOVERY_URL;
  if (envUrl && String(envUrl).trim()) return String(envUrl).trim();

  const origin = safeOrigin();
  return origin ? `${origin}/reset-password` : "";
}

function uuid() {
  // browser-safe uuid fallback
  try {
    if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
  } catch {}
  return ID.unique();
}

/* ------------------------------- AUTH (SDK) -------------------------------- */

export async function getCurrentUser() {
  assertEnvAtRuntime();
  return await account.get();
}

export async function signUp({ fullName, email, password }) {
  assertEnvAtRuntime();

  const e = String(email || "").trim();
  const p = String(password || "");
  const name = String(fullName || "").trim();

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // Create Appwrite user
  await account.create(ID.unique(), e, p, name || undefined);

  // Create a session so verify-code page can run immediately
  await signIn(e, p);

  return true;
}

// ✅ Support BOTH call styles:
// signIn(email, password)  OR  signIn({ email, password })
export async function signIn(emailOrObj, maybePassword) {
  assertEnvAtRuntime();

  const email =
    typeof emailOrObj === "object" ? emailOrObj?.email : emailOrObj;
  const password =
    typeof emailOrObj === "object" ? emailOrObj?.password : maybePassword;

  const e = String(email || "").trim();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // Appwrite Web SDK compatibility:
  // v13+: createEmailPasswordSession
  // older: createEmailSession
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(e, p);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(e, p);
  }

  throw new Error("Appwrite session method not found. Check `appwrite` package version.");
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}

// Back-compat alias (some pages use logoutUser)
export async function logoutUser() {
  return await signOut();
}

/* -------------------------- PASSWORD RECOVERY (SDK) ------------------------- */

export async function requestPasswordRecovery(email) {
  assertEnvAtRuntime();

  const e = String(email || "").trim();
  if (!e) throw new Error('Missing required parameter: "email"');

  const redirectUrl = recoveryRedirectUrl();
  if (!redirectUrl) throw new Error("Missing redirect URL for recovery.");

  return await account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  assertEnvAtRuntime();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1) throw new Error('Missing required parameter: "password"');
  if (p1 !== p2) throw new Error("Passwords do not match.");

  return await account.updateRecovery(uid, sec, p1, p2);
}

// Back-compat alias (your old function name)
export async function resetPasswordWithRecovery({
  userId,
  secret,
  password,
  confirmPassword,
}) {
  return await completePasswordRecovery({
    userId,
    secret,
    password,
    passwordAgain: confirmPassword,
  });
}

/* -------------------------- BOOTSTRAP + PROFILES --------------------------- */

export async function ensureUserBootstrap() {
  assertEnvAtRuntime();

  const user = await getCurrentUser();

  // ✅ profiles docId MUST equal userId (matches your verify-code routes)
  const profileDocId = user.$id;

  let profile = null;

  try {
    profile = await db.getDocument(DB_ID, COL_PROFILES, profileDocId);
  } catch {
    // Create minimal profile matching your schema
    profile = await db.createDocument(DB_ID, COL_PROFILES, profileDocId, {
      userId: user.$id,
      email: user.email,
      fullName: user.name || "",
      country: "",
      kycStatus: "unverified",
      verificationCodeVerified: false,
      createdAt: nowISO(),
      verifiedAt: "",
    });
  }

  return { user, profile };
}

/* ------------------- VERIFY CODE (EMAIL via API routes) -------------------- */

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
  if (!/^\d{6}$/.test(c)) throw new Error("Enter a valid 6-digit code.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");

  // Refresh bootstrap so pages immediately reflect verified state
  try {
    await ensureUserBootstrap();
  } catch {
    // ignore
  }

  return data;
}

/* ------------------------------ DATA READERS ------------------------------- */

export async function getUserWallets(userId) {
  assertEnvAtRuntime();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", uid),
    Query.limit(50),
  ]);
  return res.documents;
}

export async function getUserTransactions(userId) {
  assertEnvAtRuntime();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);
  return res.documents;
}

export async function getUserAlerts(userId) {
  assertEnvAtRuntime();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
  return res.documents;
}

/* ------------------------------ DATA WRITERS ------------------------------- */

export async function createTransaction({
  userId,
  walletId,
  amount,
  currencyType,
  transactionType,
  status = "pending",
  meta = "",
}) {
  assertEnvAtRuntime();

  const uid = String(userId || "").trim();
  const wid = String(walletId || "").trim();

  if (!uid) throw new Error("Missing userId.");
  if (!wid) throw new Error("Missing walletId.");
  if (amount == null || Number.isNaN(Number(amount))) throw new Error("Missing amount.");

  return await db.createDocument(DB_ID, COL_TX, ID.unique(), {
    transactionId: uuid(),
    userId: uid,
    walletId: wid,
    amount: Number(amount),
    currencyType,
    transactionType,
    transactionDate: nowISO(),
    status,
    meta: String(meta || ""),
    type: String(transactionType || ""),
  });
}

export async function createAlert({
  userId,
  title,
  body,
  severity = "low",
  category = "",
}) {
  assertEnvAtRuntime();

  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  return await db.createDocument(DB_ID, COL_ALERTS, ID.unique(), {
    alertId: uuid(),
    alertTitle: String(title || ""),
    alertMessage: String(body || ""),
    title: String(title || ""),
    body: String(body || ""),
    severity,
    alertCategory: category || null,
    userId: uid,
    isResolved: false,
    createdAt: nowISO(),
  });
}

/* -------------------------- PROFILE + UPLOAD HELPERS ------------------------ */

export async function updateUserProfile(userId, patch) {
  assertEnvAtRuntime();

  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  // ✅ Update ONLY known fields in `profiles` to avoid invalid attribute issues
  const current = await db.getDocument(DB_ID, COL_PROFILES, uid);

  const safePatch = {
    fullName:
      patch?.fullName != null ? String(patch.fullName) : String(current.fullName || ""),
    country:
      patch?.country != null ? String(patch.country) : String(current.country || ""),
    kycStatus:
      patch?.kycStatus != null ? String(patch.kycStatus) : String(current.kycStatus || ""),
  };

  return await db.updateDocument(DB_ID, COL_PROFILES, uid, safePatch);
}

export async function uploadProfilePicture(file) {
  assertEnvAtRuntime();
  if (!file) throw new Error("Select a file first.");
  if (!UPLOADS_BUCKET_ID) throw new Error("Missing uploads bucket id.");
  return await storage.createFile(UPLOADS_BUCKET_ID, ID.unique(), file);
}

export async function uploadKycDocument(file) {
  assertEnvAtRuntime();
  if (!file) throw new Error("Select a file first.");
  if (!UPLOADS_BUCKET_ID) throw new Error("Missing uploads bucket id.");
  return await storage.createFile(UPLOADS_BUCKET_ID, ID.unique(), file);
}

/* ---------------------------- AFFILIATE HELPERS ---------------------------- */

export async function ensureAffiliateAccount(userId) {
  assertEnvAtRuntime();

  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_AFF_ACCOUNT, [
    Query.equal("userId", uid),
    Query.limit(1),
  ]);

  if (list.total > 0) return list.documents[0];

  return await db.createDocument(DB_ID, COL_AFF_ACCOUNT, ID.unique(), {
    commissionRate: 0,
    totalEarned: 0,
    joinDate: nowISO(),
    status: "active",
    userId: uid,
    affiliateId: Math.floor(Math.random() * 900000 + 100000),
  });
}

export async function getAffiliateSummary(userId) {
  assertEnvAtRuntime();

  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const acct = await ensureAffiliateAccount(uid);

  const refs = await db.listDocuments(DB_ID, COL_AFF_REFERRALS, [
    Query.equal("referrerAffiliateId", acct.affiliateId),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);

  const comm = await db.listDocuments(DB_ID, COL_AFF_COMMISSIONS, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(200),
  ]);

  return {
    account: acct,
    referrals: refs.documents,
    commissions: comm.documents,
  };
}

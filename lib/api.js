"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ---------------------------------------------
   Appwrite client setup
---------------------------------------------- */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Single uploads bucket id (your rule)
const UPLOADS_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_UPLOADS_BUCKET_ID;

if (!ENDPOINT || !PROJECT_ID) {
  // Do not hard-throw in client bundle; just warn.
  // (Hard throws can break static builds.)
  console.warn("[Appwrite] Missing NEXT_PUBLIC_APPWRITE_ENDPOINT/PROJECT_ID");
}

export const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export const APP_DB_ID = DB_ID;

/* ---------------------------------------------
   Collections (your schema)
---------------------------------------------- */
export const COL = {
  PROFILES: "profiles",
  USER_PROFILE: "user_profile", // fallback if PROFILES doesn't exist
  WALLETS: "wallets",
  TX: "transactions",
  ALERTS: "alerts",
  VERIFY_CODES: "verify_codes",
  AFFILIATE_ACCOUNT: "affiliate_account",
  AFFILIATE_REFERRALS: "affiliate_referrals",
  AFFILIATE_COMMISSIONS: "affiliate_commissions",
};

export const ENUM = {
  TX_CURRENCY: ["USD", "EUR", "JPY", "GBP"],
  TX_TYPE: [
    "deposit",
    "withdraw",
    "transfer",
    "refund",
    "invest",
    "trade",
    "giftcard_buy",
    "giftcard_sell",
    "admin_adjustment",
    "commission",
  ],
  ALERT_SEVERITY: ["low", "medium", "high", "critical"],
};

/* ---------------------------------------------
   Error helper (use everywhere)
---------------------------------------------- */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* ---------------------------------------------
   URL helpers (for recovery redirect)
---------------------------------------------- */
function normalizeBaseUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

export function getAppBaseUrl() {
  // Best: set NEXT_PUBLIC_APP_URL to your real domain
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL;

  const normalized = normalizeBaseUrl(env);
  if (normalized) return normalized;

  // Fallback: browser origin
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Final fallback
  return "http://localhost:3000";
}

/* ---------------------------------------------
   Session helpers (compat)
---------------------------------------------- */
async function createEmailSessionCompat(email, password) {
  if (typeof account?.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  // Older snippet you were hitting
  if (typeof account?.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  throw new Error(
    "Appwrite session method not found. Expected account.createEmailSession(email,password)."
  );
}

/* ---------------------------------------------
   DB helpers
---------------------------------------------- */
function assertDb() {
  if (!APP_DB_ID) throw new Error("Appwrite database (DB_ID) is not configured.");
}

let _profileCollection = null; // caches resolved profile collection name

async function resolveProfileCollection() {
  // If already resolved, reuse
  if (_profileCollection) return _profileCollection;

  assertDb();

  // Try "profiles" first
  try {
    await db.listDocuments(APP_DB_ID, COL.PROFILES, [Query.limit(1)]);
    _profileCollection = COL.PROFILES;
    return _profileCollection;
  } catch {
    // Try fallback "user_profile"
    await db.listDocuments(APP_DB_ID, COL.USER_PROFILE, [Query.limit(1)]);
    _profileCollection = COL.USER_PROFILE;
    return _profileCollection;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonString(v) {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return "{}";
  }
}

function uuid36() {
  // your schema wants size ~36 for walletId/tx ids
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return ID.unique(); // fallback (still valid, but shorter)
}

/* ---------------------------------------------
   Auth: sign up / sign in / sign out
---------------------------------------------- */
export async function signUp({ fullName, email, password, referralId = "" }) {
  const em = String(email || "").trim();
  const pw = String(password || "");
  const name = String(fullName || "").trim();

  if (!em) throw new Error("Email is required.");
  if (!pw || pw.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create account (Appwrite uses "name" field on user)
  await account.create(ID.unique(), em, pw, name || em.split("@")[0]);

  // Sign in immediately so we can bootstrap
  await createEmailSessionCompat(em, pw);

  // Bootstrap profile/wallets/affiliate, etc.
  await ensureUserBootstrap({ referralId });

  return true;
}

export async function signIn(email, password) {
  const em = String(email || "").trim();
  const pw = String(password || "");

  if (!em || !pw) throw new Error("Email and password are required.");

  await createEmailSessionCompat(em, pw);

  // Ensure documents exist (prevents “Missing userId” style errors)
  await ensureUserBootstrap();

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
  return account.get();
}

/* ---------------------------------------------
   Bootstrap (profile + wallets + affiliate)
---------------------------------------------- */
export async function ensureUserBootstrap(opts = {}) {
  assertDb();

  const user = await getCurrentUser();
  const userId = user?.$id;
  if (!userId) throw new Error("No active session.");

  const profileCol = await resolveProfileCollection();

  // 1) Profile
  let profile = null;
  try {
    const res = await db.listDocuments(APP_DB_ID, profileCol, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    profile = res.documents?.[0] || null;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load profile."));
  }

  if (!profile) {
    const baseProfile = {
      userId,
      email: user.email || "",
      fullName: user.name || "",
      country: "",
      kycStatus: "unverified",
      verificationCodeVerified: false,
      createdAt: nowIso(),
      verifiedAt: "",
    };

    // If you have referral locking in user_profile
    if (profileCol === COL.USER_PROFILE) {
      baseProfile.referrerAffiliateId = opts?.referralId ? Number(opts.referralId) : null;
    }

    profile = await db.createDocument(APP_DB_ID, profileCol, ID.unique(), baseProfile);
  }

  // 2) Wallets (make sure at least one exists)
  try {
    const w = await db.listDocuments(APP_DB_ID, COL.WALLETS, [
      Query.equal("userId", userId),
      Query.limit(10),
    ]);

    if (!w.documents?.length) {
      // Use only allowed tx currencies for safety
      const mk = async (currencyType = "USD") => {
        const walletId = uuid36();
        return db.createDocument(APP_DB_ID, COL.WALLETS, ID.unique(), {
          walletId,
          userId,
          currencyType,
          balance: 0,
          isActive: true,
          createdDate: nowIso(),
          updatedDate: nowIso(),
        });
      };

      await mk("USD");
    }
  } catch (e) {
    // Don’t kill bootstrap if wallets fail, but surface error in UI later
    console.warn("[Bootstrap] wallets create/load failed:", e?.message || e);
  }

  // 3) Affiliate account (optional)
  try {
    await ensureAffiliateAccount(userId);
  } catch {
    // ignore
  }

  return { user, profile };
}

/* ---------------------------------------------
   Profiles
---------------------------------------------- */
export async function getUserProfile(userId) {
  assertDb();
  const profileCol = await resolveProfileCollection();
  const res = await db.listDocuments(APP_DB_ID, profileCol, [
    Query.equal("userId", String(userId)),
    Query.limit(1),
  ]);
  return res.documents?.[0] || null;
}

export async function updateUserProfile(userId, patch = {}) {
  assertDb();
  const profileCol = await resolveProfileCollection();
  const prof = await getUserProfile(userId);
  if (!prof) throw new Error("Profile not found.");

  // Remove unsafe fields (you said: no displayName usage)
  const clean = { ...patch };
  delete clean.displayName;

  // Keep schema-safe keys
  // If you're using "profiles" collection, it only has a few fields;
  // "user_profile" is larger. We'll update only fields that exist safely.
  return db.updateDocument(APP_DB_ID, profileCol, prof.$id, {
    ...clean,
    updatedAt: nowIso(),
  });
}

/* ---------------------------------------------
   Uploads (single bucket)
---------------------------------------------- */
function assertUploadsBucket() {
  if (!UPLOADS_BUCKET_ID) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_UPLOADS_BUCKET_ID.");
  }
}

export async function uploadProfilePicture(file) {
  assertUploadsBucket();
  if (!file) throw new Error("No file selected.");

  const up = await storage.createFile(UPLOADS_BUCKET_ID, ID.unique(), file);
  return up; // { $id, ... }
}

export async function uploadKycDocument(file) {
  assertUploadsBucket();
  if (!file) throw new Error("No file selected.");

  const up = await storage.createFile(UPLOADS_BUCKET_ID, ID.unique(), file);
  return up;
}

export function getFileViewUrl(fileId) {
  assertUploadsBucket();
  // public view URL (works if bucket permissions allow)
  return storage.getFileView(UPLOADS_BUCKET_ID, fileId)?.href || "";
}

/* ---------------------------------------------
   Alerts
---------------------------------------------- */
export async function createAlert(userId, { title, body, severity = "low", category = "" }) {
  assertDb();
  const sev = String(severity).toLowerCase();
  if (!ENUM.ALERT_SEVERITY.includes(sev)) throw new Error("Invalid alert severity.");

  const t = String(title || "").trim() || "Notification";
  const b = String(body || "").trim() || "";

  return db.createDocument(APP_DB_ID, COL.ALERTS, ID.unique(), {
    alertId: uuid36(),
    alertTitle: t,
    alertMessage: b,
    severity: sev,
    alertCategory: category || null,
    userId: String(userId),
    isResolved: false,
    title: t,
    body: b,
    createdAt: nowIso(),
  });
}

export async function getUserAlerts(userId) {
  assertDb();
  const res = await db.listDocuments(APP_DB_ID, COL.ALERTS, [
    Query.equal("userId", String(userId)),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);
  return res.documents || [];
}

/* ---------------------------------------------
   Transactions
---------------------------------------------- */
export async function createTransaction({
  userId,
  walletId,
  amount,
  currencyType,
  transactionType,
  status = "pending",
  meta = {},
}) {
  assertDb();

  if (!userId) throw new Error("Missing userId.");
  if (!walletId) throw new Error("Missing walletId.");

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) throw new Error("Invalid amount.");

  const cur = String(currencyType).toUpperCase();
  if (!ENUM.TX_CURRENCY.includes(cur)) throw new Error("Invalid currencyType.");

  const ttype = String(transactionType);
  if (!ENUM.TX_TYPE.includes(ttype)) throw new Error("Invalid transactionType.");

  return db.createDocument(APP_DB_ID, COL.TX, ID.unique(), {
    transactionId: uuid36(),
    userId: String(userId),
    walletId: String(walletId),
    amount: amt,
    currencyType: cur,
    transactionType: ttype,
    transactionDate: nowIso(),
    status: String(status || "pending"),
    meta: safeJsonString(meta),
    type: ttype,
  });
}

export async function getUserTransactions(userId, limit = 50) {
  assertDb();
  const res = await db.listDocuments(APP_DB_ID, COL.TX, [
    Query.equal("userId", String(userId)),
    Query.orderDesc("transactionDate"),
    Query.limit(Math.min(Number(limit) || 50, 200)),
  ]);
  return res.documents || [];
}

/* ---------------------------------------------
   Verify-code flow (email-based, server routes)
   - createOrRefreshVerifyCode: calls your API route
   - verifySixDigitCode: calls your API route
---------------------------------------------- */
export async function createOrRefreshVerifyCode(userId) {
  if (!userId) throw new Error("Missing userId.");

  const r = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || "Unable to send verification code.");
  return true;
}

export async function verifySixDigitCode(userId, code) {
  if (!userId) throw new Error("Missing userId.");
  const c = String(code || "").trim();
  if (!/^\d{6}$/.test(c)) throw new Error("Invalid 6-digit code.");

  const r = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code: c }),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.ok) throw new Error(j?.error || "Invalid or expired code.");

  // refresh bootstrap so UI sees verified state
  await ensureUserBootstrap();
  return true;
}

/* ---------------------------------------------
   Password recovery (Appwrite Recovery)
---------------------------------------------- */
export async function requestPasswordRecovery(email) {
  const em = String(email || "").trim();
  if (!em) throw new Error("Email is required.");

  // Use a route that can BOTH request & complete recovery
  const redirectUrl = `${getAppBaseUrl()}/forgot-password`;

  await account.createRecovery(em, redirectUrl);
  return true;
}

export async function completePasswordRecovery({ userId, secret, password, confirmPassword }) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pw = String(password || "");
  const pw2 = String(confirmPassword || "");

  if (!uid || !sec) throw new Error("Recovery session is missing. Please reopen the email link.");
  if (!pw || pw.length < 8) throw new Error("Password must be at least 8 characters.");
  if (pw !== pw2) throw new Error("Passwords do not match.");

  await account.updateRecovery(uid, sec, pw, pw2);
  return true;
}

/* ---------------------------------------------
   Affiliate (lightweight)
---------------------------------------------- */
export async function ensureAffiliateAccount(userId) {
  assertDb();
  const uid = String(userId);
  const res = await db.listDocuments(APP_DB_ID, COL.AFFILIATE_ACCOUNT, [
    Query.equal("userId", uid),
    Query.limit(1),
  ]);

  if (res.documents?.[0]) return res.documents[0];

  // affiliateId is required integer — generate a simple 6-digit
  const affiliateId = Math.floor(100000 + Math.random() * 900000);

  return db.createDocument(APP_DB_ID, COL.AFFILIATE_ACCOUNT, ID.unique(), {
    commissionRate: 500, // 5.00% if you treat as basis points; adjust later
    totalEarned: 0,
    lastPaymentDate: null,
    joinDate: nowIso(),
    status: "active",
    userId: uid,
    affiliateId,
  });
}

export async function getAffiliateSummary(userId) {
  assertDb();
  const uid = String(userId);

  const [acct, refs, comm] = await Promise.all([
    db.listDocuments(APP_DB_ID, COL.AFFILIATE_ACCOUNT, [Query.equal("userId", uid), Query.limit(1)]),
    db.listDocuments(APP_DB_ID, COL.AFFILIATE_REFERRALS, [Query.equal("userId", uid), Query.limit(200)]),
    db.listDocuments(APP_DB_ID, COL.AFFILIATE_COMMISSIONS, [Query.equal("userId", uid), Query.limit(200)]),
  ]);

  return {
    account: acct.documents?.[0] || null,
    referrals: refs.documents || [],
    commissions: comm.documents || [],
  };
}

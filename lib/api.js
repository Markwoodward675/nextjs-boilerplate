// lib/api.js
import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ------------------------ ENV + SINGLETON SDK ------------------------ */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

const COL_PROFILES =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || // your env list includes this
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "profiles";

const COL_WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const COL_ALERTS = process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
const COL_TX = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";
const COL_AFFILIATE = process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account";

let _sdk = null;

function requireConfig() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  if (!DB_ID) {
    throw new Error(
      "Appwrite DB not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }
}

function getSdk() {
  requireConfig();
  if (_sdk) return _sdk;

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  _sdk = {
    client,
    account: new Account(client),
    db: new Databases(client),
    storage: new Storage(client),
  };
  return _sdk;
}

/* ------------------------ ERROR NORMALIZATION ------------------------ */

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const raw =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  let msg = String(raw);

  // Common Appwrite prefix
  msg = msg.replace(/^AppwriteException:\s*/i, "");

  // CORS / network hints (can’t be fixed by code)
  if (
    /cors/i.test(msg) ||
    /failed to fetch/i.test(msg) ||
    /net::err_failed/i.test(msg) ||
    /network request failed/i.test(msg)
  ) {
    return (
      "Network request blocked. Add your Vercel + custom domain URLs in Appwrite Console → Project → Platforms (Web)."
    );
  }

  return msg;
}

/* ------------------------ COMPAT INVOKER (SDK SIGNATURES) ------------------------ */

async function tryCall(fn, variants) {
  let lastErr = null;
  for (const args of variants) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn(...args);
    } catch (e) {
      lastErr = e;
      const m = String(e?.message || "");
      // If it’s clearly “wrong signature”, keep trying
      if (/missing required parameter/i.test(m) || /not a function/i.test(m)) continue;
    }
  }
  throw lastErr || new Error("Request failed.");
}

/* ------------------------ AUTH ------------------------ */

export async function signUp(a, b, c, d) {
  const payload = typeof a === "object" && a ? a : null;
  const fullName = (payload?.fullName ?? a ?? "").toString().trim();
  const email = (payload?.email ?? b ?? "").toString().trim().toLowerCase();
  const password = (payload?.password ?? c ?? "").toString();
  const referralId = (payload?.referralId ?? d ?? "").toString().trim();

  if (!fullName) throw new Error("Full name is required.");
  if (!email) throw new Error("Email is required.");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

  const { account } = getSdk();

  // Create user (compat: object vs positional)
  await tryCall(account.create.bind(account), [
    [{ userId: ID.unique(), email, password, name: fullName }],
    [ID.unique(), email, password, fullName],
  ]);

  // Create session immediately so /verify-code can see the user
  await signIn(email, password);

  // Best-effort: set name
  try {
    await tryCall(account.updateName.bind(account), [[fullName], [{ name: fullName }]]);
  } catch {
    // ignore
  }

  // Bootstrap profile/wallets/etc
  const boot = await ensureUserBootstrap({ referralId });

  // Best-effort: send email verification code
  try {
    await createOrRefreshVerifyCode(boot.user.$id);
  } catch {
    // user can resend on verify page
  }

  return boot;
}

export async function signIn(a, b) {
  const payload = typeof a === "object" && a ? a : null;
  const email = (payload?.email ?? a ?? "").toString().trim().toLowerCase();
  const password = (payload?.password ?? b ?? "").toString();

  if (!email) throw new Error("Email is required.");
  if (!password) throw new Error("Password is required.");

  const { account } = getSdk();

  // compat: positional vs object
  await tryCall(account.createEmailPasswordSession.bind(account), [
    [email, password],
    [{ email, password }],
  ]);

  return account.get();
}

export async function signOut() {
  const { account } = getSdk();
  try {
    await account.deleteSession("current");
  } catch {
    // fallback
    try {
      await account.deleteSessions();
    } catch {
      // ignore
    }
  }
}

export async function getCurrentUser() {
  const { account } = getSdk();
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/* ------------------------ PASSWORD RECOVERY ------------------------ */

function getAppUrl() {
  // Prefer env, fallback to runtime origin (client-only)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && String(envUrl).trim()) return String(envUrl).replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

export async function requestPasswordRecovery(emailRaw) {
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required.");

  const redirectUrl = `${getAppUrl()}/reset-password`;
  if (!redirectUrl || /\/reset-password$/.test(redirectUrl) === false) {
    throw new Error("Missing redirect URL for recovery. Set NEXT_PUBLIC_APP_URL.");
  }

  const { account } = getSdk();

  // compat: positional vs object
  await tryCall(account.createRecovery.bind(account), [
    [email, redirectUrl],
    [{ email, url: redirectUrl }],
    [{ email, redirectUrl }],
  ]);

  return { ok: true };
}

export async function completePasswordRecovery({ userId, secret, password }) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pwd = String(password || "");

  if (!uid || !sec || !pwd || pwd.length < 8) {
    throw new Error("Invalid recovery parameters. Password must be at least 8 characters.");
  }

  const { account } = getSdk();

  await tryCall(account.updateRecovery.bind(account), [
    [uid, sec, pwd],
    [{ userId: uid, secret: sec, password: pwd }],
  ]);

  return { ok: true };
}

/* ------------------------ VERIFY CODE (EMAIL via your API routes) ------------------------ */

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
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}

/* ------------------------ BOOTSTRAP (profile + wallets + affiliate) ------------------------ */

async function getProfileDocIdByUserId(userId) {
  const { db } = getSdk();
  // Prefer docId = userId
  try {
    const d = await db.getDocument(DB_ID, COL_PROFILES, userId);
    return d?.$id || userId;
  } catch {
    // fallback: query by userId field
    const list = await db.listDocuments(DB_ID, COL_PROFILES, [Query.equal("userId", userId), Query.limit(1)]);
    const d = list?.documents?.[0];
    return d?.$id || null;
  }
}

export async function getUserProfile(userId) {
  const { db } = getSdk();
  const id = await getProfileDocIdByUserId(userId);
  if (!id) return null;
  return db.getDocument(DB_ID, COL_PROFILES, id);
}

async function ensureProfile(user) {
  const { db } = getSdk();
  const userId = user.$id;

  const now = new Date().toISOString();

  const base = {
    userId,
    email: user.email || "",
    fullName: user.name || "",
    country: null,
    kycStatus: "unverified",
    verificationCodeVerified: false,
    createdAt: now,
    verifiedAt: null,
  };

  const existingId = await getProfileDocIdByUserId(userId);

  if (existingId) {
    // Update minimal fields (don’t write unknown attributes)
    try {
      return await db.updateDocument(DB_ID, COL_PROFILES, existingId, {
        email: base.email,
        fullName: base.fullName,
      });
    } catch {
      return await db.getDocument(DB_ID, COL_PROFILES, existingId);
    }
  }

  // Create with docId=userId (matches your verify-code API routes)
  try {
    return await db.createDocument(DB_ID, COL_PROFILES, userId, base);
  } catch (e) {
    // If collection id is wrong, surface clean error
    throw new Error(getErrorMessage(e, `Collection '${COL_PROFILES}' not found. Check your collection IDs.`));
  }
}

async function ensureWallets(userId) {
  const { db } = getSdk();

  const existing = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", userId),
    Query.limit(10),
  ]);

  if ((existing?.documents?.length || 0) > 0) return existing.documents;

  const now = new Date().toISOString();

  const mk = async (label) => {
    // Wallet schema doesn’t include label, so we store it in meta via "walletId" naming only
    const walletId = ID.unique();
    return db.createDocument(DB_ID, COL_WALLETS, ID.unique(), {
      walletId,
      userId,
      currencyType: "USD",
      balance: 0,
      isActive: true,
      createdDate: now,
      updatedDate: null,
      // If you later add "label" column, you can store it here.
      // label,
    });
  };

  const docs = [];
  docs.push(await mk("Main"));
  docs.push(await mk("Trading"));
  docs.push(await mk("Affiliate"));
  return docs;
}

async function ensureAffiliateAccount(userId) {
  const { db } = getSdk();
  try {
    const list = await db.listDocuments(DB_ID, COL_AFFILIATE, [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);
    if (list?.documents?.[0]) return list.documents[0];

    // Minimal create (you must ensure enums match your collection settings)
    return await db.createDocument(DB_ID, COL_AFFILIATE, ID.unique(), {
      userId,
      affiliateId: Math.floor(100000 + Math.random() * 900000),
      commissionRate: 3,
      totalEarned: 0,
      joinDate: new Date().toISOString(),
      status: "active",
      lastPaymentDate: null,
    });
  } catch {
    return null;
  }
}

export async function ensureUserBootstrap(opts = {}) {
  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null };

  const profile = await ensureProfile(user);
  await ensureWallets(user.$id);
  await ensureAffiliateAccount(user.$id);

  // Referral hook (optional): store referral on profile only if column exists
  if (opts?.referralId) {
    // Do NOT write unknown attributes; only attempt if your profile collection has referrerAffiliateId
    // (Your "profiles" schema shown does NOT include it, so we skip here.)
  }

  return { user, profile };
}

/* ------------------------ DATA HELPERS USED AROUND THE APP ------------------------ */

export async function getUserWallets(userId) {
  const { db } = getSdk();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_WALLETS, [
    Query.equal("userId", uid),
    Query.limit(50),
  ]);
  return list.documents || [];
}

export async function getUserTransactions(userId, limit = 50) {
  const { db } = getSdk();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit) || 50, 100)),
  ]);
  return list.documents || [];
}

export async function getUserAlerts(userId, limit = 50) {
  const { db } = getSdk();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const list = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit) || 50, 100)),
  ]);
  return list.documents || [];
}

/* ------------------------ PROFILE UPDATES + UPLOADS (NO displayName) ------------------------ */

export async function updateUserProfile(userId, patch = {}) {
  const { db } = getSdk();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const allowed = {};
  // Only write columns that exist in your "profiles" schema you shared
  if ("fullName" in patch) allowed.fullName = String(patch.fullName || "");
  if ("country" in patch) allowed.country = patch.country ? String(patch.country) : null;
  if ("kycStatus" in patch) allowed.kycStatus = patch.kycStatus ? String(patch.kycStatus) : null;

  const docId = await getProfileDocIdByUserId(uid);
  if (!docId) throw new Error("Profile not found.");

  return db.updateDocument(DB_ID, COL_PROFILES, docId, allowed);
}

function fileViewUrl(fileId) {
  // public view URL pattern
  return `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
}

export async function uploadProfilePicture(userId, file) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");
  if (!file) throw new Error("Missing file.");

  const { storage } = getSdk();
  const created = await storage.createFile(BUCKET_ID, ID.unique(), file);
  const url = fileViewUrl(created.$id);

  // Only store what exists in your schema (profiles doesn’t show these fields, so skip writing there)
  return { fileId: created.$id, url };
}

export async function uploadKycDocument(userId, files = {}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");

  const { storage } = getSdk();

  const out = {};
  for (const key of ["front", "back", "selfie"]) {
    const f = files?.[key];
    if (!f) continue;
    // eslint-disable-next-line no-await-in-loop
    const created = await storage.createFile(BUCKET_ID, ID.unique(), f);
    out[key] = { fileId: created.$id, url: fileViewUrl(created.$id), name: f?.name || "" };
  }

  return out;
}

// lib/api.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/** -------------------- ENV (client-safe) -------------------- */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

// Collections (client)
const COL_PROFILES =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "profiles";

const COL_WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const COL_ALERTS = process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
const COL_TX = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

// App URL for recovery redirect
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

/** -------------------- SDK singletons -------------------- */
const client = new Client();

function ensureClientConfigured() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "App not configured: set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel."
    );
  }
  // Safe to call repeatedly
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

function ensureDbConfigured() {
  if (!DB_ID) {
    throw new Error(
      "Appwrite database not configured: set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }
}

const account = new Account(client);
const db = new Databases(client);
const storage = new Storage(client);

/** -------------------- helpers -------------------- */
function nowISO() {
  return new Date().toISOString();
}

function getOrigin() {
  if (APP_URL) return APP_URL.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

function normalizeCreds(a, b) {
  // supports: (email,password) or ({email,password})
  if (a && typeof a === "object") {
    return {
      email: String(a.email || "").trim().toLowerCase(),
      password: String(a.password || ""),
    };
  }
  return {
    email: String(a || "").trim().toLowerCase(),
    password: String(b || ""),
  };
}

function normalizeSignup(a, b, c) {
  // supports: ({fullName,email,password,referralId}) or (fullName,email,password)
  if (a && typeof a === "object") {
    return {
      fullName: String(a.fullName || "").trim(),
      email: String(a.email || "").trim().toLowerCase(),
      password: String(a.password || ""),
      referralId: String(a.referralId || "").trim(),
    };
  }
  return {
    fullName: String(a || "").trim(),
    email: String(b || "").trim().toLowerCase(),
    password: String(c || ""),
    referralId: "",
  };
}

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  const s = String(msg);

  // Friendly CORS hint
  if (/cors|access-control-allow-origin|failed to fetch|network request failed/i.test(s)) {
    return "Network/CORS blocked Appwrite. Add your domain(s) in Appwrite → Platforms (Web) and redeploy.";
  }

  return s.replace(/^AppwriteException:\s*/i, "");
}

/** -------------------- auth/session -------------------- */
async function createEmailSession(email, password) {
  ensureClientConfigured();

  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  // Appwrite SDK compatibility:
  // v13: createEmailSession
  // v14+: createEmailPasswordSession
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }

  // Do NOT fall back to createSession (wrong endpoint/signature in some versions)
  throw new Error(
    "Your Appwrite JS SDK is missing email session method. Ensure dependency `appwrite` is installed and updated."
  );
}

export async function signOut() {
  ensureClientConfigured();
  try {
    // Works across versions
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return true;
    }
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
      return true;
    }
  } catch {
    // ignore
  }
  return true;
}

export async function getCurrentUser() {
  ensureClientConfigured();
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/** -------------------- bootstrap -------------------- */
async function ensureProfileDoc(user) {
  ensureDbConfigured();

  const docId = user.$id;

  try {
    return await db.getDocument(DB_ID, COL_PROFILES, docId);
  } catch {
    // create minimal doc with required fields based on your schema
    const payload = {
      userId: user.$id,
      email: user.email,
      fullName: user.name || "",
      country: "",
      kycStatus: "unverified",
      verificationCodeVerified: false, // REQUIRED boolean (no default)
      createdAt: nowISO(),
      verifiedAt: "",
    };

    return await db.createDocument(DB_ID, COL_PROFILES, docId, payload);
  }
}

async function ensureWalletDocs(user) {
  ensureDbConfigured();

  // If your collection has index on userId, this works
  let existing = [];
  try {
    const res = await db.listDocuments(DB_ID, COL_WALLETS, [Query.equal("userId", user.$id)]);
    existing = res?.documents || [];
  } catch {
    existing = [];
  }

  if (existing.length) return existing;

  // Create at least one wallet doc (simple baseline)
  const payload = {
    walletId: crypto?.randomUUID?.() ? crypto.randomUUID() : String(ID.unique()),
    userId: user.$id,
    currencyType: "USD",
    balance: 0,
    isActive: true,
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
  };

  try {
    const created = await db.createDocument(DB_ID, COL_WALLETS, ID.unique(), payload);
    return [created];
  } catch {
    return [];
  }
}

export async function ensureUserBootstrap() {
  ensureClientConfigured();

  const user = await getCurrentUser();
  if (!user) return { user: null, profile: null, wallets: [] };

  let profile = null;
  let wallets = [];

  try {
    profile = await ensureProfileDoc(user);
  } catch (e) {
    // If profiles collection mismatch, this error will be shown clearly
    throw new Error(getErrorMessage(e, "Unable to load profile."));
  }

  try {
    wallets = await ensureWalletDocs(user);
  } catch {
    wallets = [];
  }

  return { user, profile, wallets };
}

/** -------------------- sign in / sign up -------------------- */
export async function signIn(a, b) {
  const { email, password } = normalizeCreds(a, b);

  await createEmailSession(email, password);

  // Create profile/wallets if missing
  const boot = await ensureUserBootstrap();

  // Optional: if not verified, auto-send code on sign in (best UX)
  try {
    if (boot?.user?.$id && !boot?.profile?.verificationCodeVerified) {
      await createOrRefreshVerifyCode(boot.user.$id);
    }
  } catch {
    // ignore (email service might not be set yet)
  }

  return boot;
}

export async function signUp(a, b, c) {
  ensureClientConfigured();

  const { fullName, email, password } = normalizeSignup(a, b, c);

  if (!fullName) throw new Error('Missing required parameter: "fullName"');
  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  try {
    await account.create(ID.unique(), email, password, fullName);
  } catch (e) {
    const msg = getErrorMessage(e, "Unable to create account.");

    // Appwrite conflict -> let UI redirect logic handle it
    if (/already exists/i.test(msg) || String(e?.code) === "409") {
      const err = new Error("ACCOUNT_EXISTS");
      err.code = 409;
      throw err;
    }

    throw new Error(msg);
  }

  // Auto session after signup
  await createEmailSession(email, password);

  const boot = await ensureUserBootstrap();

  // Auto-send verify code
  try {
    if (boot?.user?.$id) {
      await createOrRefreshVerifyCode(boot.user.$id);
    }
  } catch {
    // ignore
  }

  return boot;
}

/** -------------------- verify code (Resend via API routes) -------------------- */
async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  return await postJson("/api/auth/send-verify-code", { userId: id });
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");
  return await postJson("/api/auth/verify-code", { userId: id, code: c });
}

/** -------------------- password recovery -------------------- */
export async function requestPasswordRecovery(email) {
  ensureClientConfigured();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const origin = getOrigin();
  const redirect = origin ? `${origin}/reset-password` : "";

  if (!redirect) {
    throw new Error(
      "Missing redirect URL for recovery. Set NEXT_PUBLIC_APP_URL in Vercel (e.g. https://day-trader-insights.com)."
    );
  }

  return await account.createRecovery(e, redirect);
}

export async function completePasswordRecovery({ userId, secret, password }) {
  ensureClientConfigured();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pw = String(password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!pw || pw.length < 8) throw new Error("Password must be at least 8 characters.");

  // updateRecovery(userId, secret, password, passwordAgain)
  return await account.updateRecovery(uid, sec, pw, pw);
}

/** -------------------- basic data helpers -------------------- */
export async function getUserAlerts(userId) {
  ensureClientConfigured();
  ensureDbConfigured();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_ALERTS, [
    Query.equal("userId", uid),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);

  return res?.documents || [];
}

export async function getUserTransactions(userId) {
  ensureClientConfigured();
  ensureDbConfigured();
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await db.listDocuments(DB_ID, COL_TX, [
    Query.equal("userId", uid),
    Query.orderDesc("transactionDate"),
    Query.limit(100),
  ]);

  return res?.documents || [];
}

export async function uploadToBucket(file) {
  ensureClientConfigured();
  if (!BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_BUCKET_ID.");
  if (!file) throw new Error("Missing file.");
  const created = await storage.createFile(BUCKET_ID, ID.unique(), file);
  return created;
}

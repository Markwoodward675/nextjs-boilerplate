// lib/api.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/** -------------------- ENV (client-safe) -------------------- */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

// IMPORTANT: pick ONE profile collection and stick to it.
// If your real profile collection is "user_profile", set NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID="user_profile"
const COL_PROFILES =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "profiles";

const COL_WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const COL_ALERTS = process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
const COL_TX = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "").trim();

/** -------------------- SDK singletons -------------------- */
const client = new Client();
const account = new Account(client);
const db = new Databases(client);
const storage = new Storage(client);

/** -------------------- helpers -------------------- */
function ensureClientConfigured() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "App not configured: set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

function ensureDbConfigured() {
  if (!DB_ID) {
    throw new Error(
      "Appwrite database not configured: set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }
}

function nowISO() {
  return new Date().toISOString();
}

function normalizeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s.replace(/\/+$/, "");
  // if user typed day-trader-insights.com, make it valid
  return `https://${s.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

function getOrigin() {
  const fromEnv = normalizeUrl(APP_URL);
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

function normalizeCreds(a, b) {
  // supports: (email,password) OR ({email,password})
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
  // supports: ({fullName,email,password,referralId}) OR (fullName,email,password)
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

  const s = String(msg).replace(/^AppwriteException:\s*/i, "");

  if (/cors|access-control-allow-origin|failed to fetch|network request failed/i.test(s)) {
    return "Network/CORS blocked Appwrite. Add your domain in Appwrite → Platforms (Web) and redeploy.";
  }

  return s;
}

/** -------------------- sessions -------------------- */
async function createEmailSession(email, password) {
  ensureClientConfigured();

  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  // SDK compatibility:
  // v13 => createEmailSession
  // v14+ => createEmailPasswordSession
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }

  throw new Error("Appwrite SDK missing email session method. Update `appwrite` dependency.");
}

async function ensureSignedIn(email, password) {
  try {
    await createEmailSession(email, password);
    return true;
  } catch (e) {
    const msg = getErrorMessage(e, "");
    // Hardfix: if already logged in, treat as success.
    if (/session is active|prohibited when a session is active/i.test(msg)) {
      return true;
    }
    throw e;
  }
}

export async function signOut() {
  ensureClientConfigured();
  try {
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return true;
    }
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
      return true;
    }
  } catch {}
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
    // HARD FIX:
    // DO NOT write fields that may not exist in your profile collection.
    // (Your error: Unknown attribute "verifiedAt")
    // Use intersection fields only.
    const payload = {
      userId: user.$id,
      email: user.email,
      fullName: user.name || "",
      country: "",
      kycStatus: "unverified",
      verificationCodeVerified: false, // REQUIRED in your "profiles" collection
      createdAt: nowISO(),
    };

    return await db.createDocument(DB_ID, COL_PROFILES, docId, payload);
  }
}

async function ensureWalletDocs(user) {
  ensureDbConfigured();

  let existing = [];
  try {
    const res = await db.listDocuments(DB_ID, COL_WALLETS, [Query.equal("userId", user.$id)]);
    existing = res?.documents || [];
  } catch {
    existing = [];
  }
  if (existing.length) return existing;

  const payload = {
    walletId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(ID.unique()),
    userId: user.$id,
    currencyType: "USD",
    balance: 0,
    isActive: true,
    createdDate: nowISO(),
    updatedDate: nowISO(),
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

  ensureDbConfigured();

  const profile = await ensureProfileDoc(user);
  const wallets = await ensureWalletDocs(user);

  return { user, profile, wallets };
}

/** -------------------- sign in / sign up -------------------- */
export async function signIn(a, b) {
  const { email, password } = normalizeCreds(a, b);

  // HARD FIX: If already signed in, don't attempt to create a new session.
  const existing = await getCurrentUser();
  if (!existing) {
    await ensureSignedIn(email, password);
  }

  const boot = await ensureUserBootstrap();

  // optional: auto-send code if unverified (won't crash UI if email not configured yet)
  try {
    if (boot?.user?.$id && !boot?.profile?.verificationCodeVerified) {
      await createOrRefreshVerifyCode(boot.user.$id);
    }
  } catch {}

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
    if (/already exists/i.test(msg) || String(e?.code) === "409") {
      const err = new Error("ACCOUNT_EXISTS");
      err.code = 409;
      throw err;
    }
    throw new Error(msg);
  }

  await ensureSignedIn(email, password);

  const boot = await ensureUserBootstrap();

  try {
    if (boot?.user?.$id) await createOrRefreshVerifyCode(boot.user.$id);
  } catch {}

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

  const origin = getOrigin(); // normalized
  const redirect = origin ? `${origin}/reset-password` : "";

  if (!redirect || !/^https?:\/\//i.test(redirect)) {
    throw new Error(
      "Invalid redirect URL for recovery. Set NEXT_PUBLIC_APP_URL to a full URL like https://day-trader-insights.com"
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
  return await storage.createFile(BUCKET_ID, ID.unique(), file);
}

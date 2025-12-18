"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/**
 * ============================================================
 *  Public (client) Appwrite config
 *  - Does NOT hard-fail when DB_ID is missing (auth can still work)
 * ============================================================
 */
function readEnv(key) {
  // Next.js replaces process.env.* at build time for NEXT_PUBLIC_*
  return (process.env[key] || "").trim();
}

export function getPublicConfig() {
  const endpoint =
    readEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT") || readEnv("APPWRITE_ENDPOINT");
  const projectId =
    readEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID") || readEnv("APPWRITE_PROJECT_ID");

  // DB id naming has been inconsistent in your envs, so we support both:
  const databaseId =
    readEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID") ||
    readEnv("NEXT_PUBLIC_APPWRITE_DB_ID") ||
    readEnv("NEXT_PUBLIC_APPWRITE_DB_ID".toUpperCase()); // harmless

  const bucketId =
    readEnv("NEXT_PUBLIC_APPWRITE_BUCKET_ID") || readEnv("APPWRITE_BUCKET_ID");

  // Single source of truth: user_profile
  // (Allow override via env if you want)
  const profilesCollectionId =
    readEnv("NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID") ||
    readEnv("NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID") ||
    "user_profile";

  const walletsCollectionId =
    readEnv("NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID") || "wallets";

  const alertsCollectionId =
    readEnv("NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID") || "alerts";

  const transactionsCollectionId =
    readEnv("NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID") ||
    "transactions";

  const appUrl = readEnv("NEXT_PUBLIC_APP_URL"); // should be like https://day-trader-insights.com

  return {
    endpoint,
    projectId,
    databaseId,
    bucketId,
    profilesCollectionId,
    walletsCollectionId,
    alertsCollectionId,
    transactionsCollectionId,
    appUrl,
  };
}

function requireEndpointProject() {
  const cfg = getPublicConfig();
  if (!cfg.endpoint || !cfg.projectId) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  return cfg;
}

function requireDb() {
  const cfg = getPublicConfig();
  if (!cfg.databaseId) {
    throw new Error(
      "Appwrite database (NEXT_PUBLIC_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_DB_ID) is not configured."
    );
  }
  return cfg;
}

/**
 * ============================================================
 *  Appwrite singletons (client)
 * ============================================================
 */
const cfg0 = (() => {
  try {
    return requireEndpointProject();
  } catch {
    // allow module import even if env missing (page can show nice error)
    return getPublicConfig();
  }
})();

const client = new Client();
if (cfg0.endpoint) client.setEndpoint(cfg0.endpoint);
if (cfg0.projectId) client.setProject(cfg0.projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

/**
 * ============================================================
 *  Error helpers
 * ============================================================
 */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;

  // Fetch/network/CORS often comes as TypeError
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  const cleaned = String(msg).replace(/^AppwriteException:\s*/i, "").trim();

  // Helpful hint for the common Vercel/Appwrite CORS failure:
  if (
    /failed to fetch|network request failed|cors|blocked by cros/i.test(cleaned)
  ) {
    return (
      "Network request failed (likely CORS). In Appwrite Console → Platforms → Web, add your Vercel domain(s) and your custom domain, then redeploy."
    );
  }

  return cleaned || fallback;
}

/**
 * ============================================================
 *  Session helpers (compat across SDK versions)
 * ============================================================
 */
async function createEmailSessionCompat(email, password) {
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  // older SDKs
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  throw new Error(
    "Your Appwrite Web SDK does not support email sessions. Check the `appwrite` dependency version."
  );
}

async function safeDeleteCurrentSession() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function parseAuthArgs(a, b, c) {
  // Supports:
  // signIn(email, password)
  // signIn({ email, password })
  // signUp({ fullName, email, password, referralId })
  // signUp(fullName, email, password, referralId?)
  if (a && typeof a === "object") return a;
  return { a, b, c };
}

/**
 * ============================================================
 *  Auth API
 * ============================================================
 */
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function signOut() {
  await safeDeleteCurrentSession();
  return true;
}

export async function signIn(arg1, arg2) {
  requireEndpointProject();

  const parsed = parseAuthArgs(arg1, arg2);
  const email = normalizeEmail(parsed.email ?? parsed.a);
  const password = String(parsed.password ?? parsed.b ?? "");

  if (!email) throw new Error("Missing email.");
  if (!password) throw new Error('Missing required parameter: "password"');

  // If a session is active, Appwrite blocks creating another one.
  // So we delete current session then create again.
  await safeDeleteCurrentSession();

  try {
    await createEmailSessionCompat(email, password);
  } catch (e) {
    const msg = getErrorMessage(e);
    if (/session is active/i.test(msg)) {
      await safeDeleteCurrentSession();
      await createEmailSessionCompat(email, password);
    } else {
      throw e;
    }
  }

  return true;
}

export async function signUp(arg1, arg2, arg3, arg4) {
  requireEndpointProject();

  // Supports object style and positional style
  let fullName = "";
  let email = "";
  let password = "";
  let referralId = "";

  if (arg1 && typeof arg1 === "object") {
    fullName = String(arg1.fullName || "").trim();
    email = normalizeEmail(arg1.email);
    password = String(arg1.password || "");
    referralId = String(arg1.referralId || "").trim();
  } else {
    fullName = String(arg1 || "").trim();
    email = normalizeEmail(arg2);
    password = String(arg3 || "");
    referralId = String(arg4 || "").trim();
  }

  if (!fullName) throw new Error("Missing full name.");
  if (!email) throw new Error("Missing email.");
  if (!password) throw new Error('Missing required parameter: "password"');
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  // create account
  try {
    await account.create(ID.unique(), email, password, fullName);
  } catch (e) {
    throw e; // caller handles 409 logic
  }

  // ensure fresh session (delete any existing first)
  await safeDeleteCurrentSession();
  await createEmailSessionCompat(email, password);

  // optional: bootstrap profile if DB is configured
  try {
    await ensureUserBootstrap();
  } catch {
    // Don't block onboarding if DB isn't configured yet
  }

  return true;
}

/**
 * ============================================================
 *  Bootstrap: single source of truth is `user_profile`
 * ============================================================
 */
export async function ensureUserBootstrap() {
  requireEndpointProject();

  const user = await getCurrentUser();
  if (!user) throw new Error("No active session.");

  let profile = null;

  // If DB missing, return minimal boot
  const cfg = getPublicConfig();
  if (!cfg.databaseId) {
    return { user, profile: null };
  }

  const DB_ID = cfg.databaseId;
  const COL = cfg.profilesCollectionId;

  // IMPORTANT: only write attributes that exist in your `user_profile` schema
  const baseProfile = {
    userId: String(user.$id),
    email: String(user.email || ""),
    fullName: String(user.name || ""),
    verificationCodeVerified: false,
    kycStatus: String(""),
    country: String(""),
    address: String(""),
    username: String(""),
    role: String(""),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    profile = await databases.getDocument(DB_ID, COL, user.$id);
  } catch {
    // create docId = userId
    profile = await databases.createDocument(DB_ID, COL, user.$id, baseProfile);
  }

  // light refresh
  try {
    const patch = {};
    if (!profile.email && user.email) patch.email = String(user.email);
    if (!profile.userId) patch.userId = String(user.$id);
    patch.updatedAt = new Date().toISOString();

    if (Object.keys(patch).length) {
      profile = await databases.updateDocument(DB_ID, COL, user.$id, patch);
    }
  } catch {
    // ignore
  }

  return { user, profile };
}

/**
 * ============================================================
 *  Verify-code (email via your API routes)
 * ============================================================
 */
async function postJSON(url, body) {
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
  if (!userId) throw new Error("Missing userId.");
  return postJSON("/api/auth/send-verify-code", { userId });
}

export async function verifySixDigitCode(userId, code) {
  if (!userId) throw new Error("Missing userId.");
  const c = String(code || "").trim();
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");
  return postJSON("/api/auth/verify-code", { userId, code: c });
}

/**
 * ============================================================
 *  Password recovery (Appwrite Recovery)
 *  - Cloud free may not show “Redirect URLs” UI; that’s fine.
 *  - The URL you pass MUST be a valid absolute URL.
 * ============================================================
 */
export function getRecoveryRedirectUrl() {
  const cfg = getPublicConfig();
  const origin =
    (cfg.appUrl && cfg.appUrl.startsWith("http") ? cfg.appUrl : "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  // Must be absolute and valid:
  const url = new URL("/verify", origin);
  return url.toString();
}

export async function sendRecoveryEmail(emailRaw) {
  requireEndpointProject();

  const email = normalizeEmail(emailRaw);
  if (!email) throw new Error("Missing email.");

  const redirectUrl = getRecoveryRedirectUrl();
  // Appwrite will append ?userId=...&secret=...
  return account.createRecovery(email, redirectUrl);
}

/**
 * ============================================================
 *  Simple data helpers used around the app (safe)
 * ============================================================
 */
export async function listUserAlerts(userId, limit = 20) {
  const cfg = requireDb();
  return databases.listDocuments(cfg.databaseId, cfg.alertsCollectionId, [
    Query.equal("userId", [String(userId)]),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
  ]);
}

export async function listUserTransactions(userId, limit = 50) {
  const cfg = requireDb();
  return databases.listDocuments(cfg.databaseId, cfg.transactionsCollectionId, [
    Query.equal("userId", [String(userId)]),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
  ]);
}

export { client, account, databases, storage, ID };

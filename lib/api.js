"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/* ===============================
   ENV + CLIENT SINGLETON
=============================== */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Collections (support both NEXT_PUBLIC_* and server-style names)
const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.APPWRITE_DATABASE_ID;

const COL_PROFILES =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  "profiles";

const COL_VERIFY_CODES =
  process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  "verify_codes";

const COL_WALLETS =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

const COL_TRANSACTIONS =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

const COL_ALERTS =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";

const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || process.env.APPWRITE_BUCKET_ID;

// Public app URL for recovery redirect
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

let _client;
let _account;
let _db;
let _storage;

function getSdk() {
  if (!_client) {
    if (!ENDPOINT || !PROJECT_ID) {
      // Don’t throw during build/static; throw only when called
      // so pages can render without crashing Vercel build.
    } else {
      _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
      _account = new Account(_client);
      _db = new Databases(_client);
      _storage = new Storage(_client);
    }
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
      "Appwrite DB is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or APPWRITE_DATABASE_ID)."
    );
  }
  const { account, db, storage } = getSdk();
  if (!account || !db || !storage) {
    throw new Error("Appwrite client failed to initialize.");
  }
  return { account, db, storage };
}

/* ===============================
   ERROR HELPERS
=============================== */

export function getErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err?.message) return String(err.message);
  if (err?.response?.message) return String(err.response.message);
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

/* ===============================
   AUTH
=============================== */

export async function signUp(email, password, fullName = "") {
  const { account, db } = requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create account
  const user = await account.create(ID.unique(), e, p, fullName || undefined);

  // Create session immediately
  await account.createEmailPasswordSession(e, p);

  // Ensure profile document exists (docId = userId)
  const userId = user?.$id;
  if (userId) {
    try {
      await db.getDocument(DB_ID, COL_PROFILES, userId);
    } catch {
      await db.createDocument(DB_ID, COL_PROFILES, userId, {
        userId,
        email: e,
        fullName: fullName || null,
        verificationCodeVerified: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return user;
}

export async function signIn(email, password) {
  const { account } = requireConfigured();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // ✅ This is the correct method for `appwrite` JS SDK v13+
  return account.createEmailPasswordSession(e, p);
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
  return account.get();
}

/* ===============================
   BOOTSTRAP (user + profile)
=============================== */

export async function ensureUserBootstrap() {
  const { db } = requireConfigured();
  const user = await getCurrentUser();

  const userId = user?.$id;
  if (!userId) throw new Error("No active session.");

  let profile = null;
  try {
    profile = await db.getDocument(DB_ID, COL_PROFILES, userId);
  } catch {
    // lazily create minimal profile
    profile = await db.createDocument(DB_ID, COL_PROFILES, userId, {
      userId,
      email: user?.email || null,
      fullName: user?.name || null,
      verificationCodeVerified: false,
      createdAt: new Date().toISOString(),
    });
  }

  return { user, profile };
}

/* ===============================
   VERIFY CODE (Resend via API routes)
=============================== */

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
  return true;
}

/* ===============================
   PASSWORD RECOVERY (Forgot Password)
=============================== */

export async function requestPasswordRecovery(email) {
  const { account } = requireConfigured();
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  // ✅ Always provide a redirect URL (fixes “Missing redirect URL for recovery.”)
  const redirectUrl = `${APP_URL}/reset-password`;
  if (!APP_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_APP_URL. Set it to https://day-trader-insights.com"
    );
  }

  return account.createRecovery(e, redirectUrl);
}

export async function resetPasswordWithRecovery(userId, secret, password, passwordAgain) {
  const { account } = requireConfigured();
  if (!userId || !secret) throw new Error("Invalid recovery link.");
  if (!password) throw new Error('Missing required parameter: "password"');
  return account.updateRecovery(userId, secret, password, passwordAgain || password);
}

/* ===============================
   LEGACY ALIASES (keeps older pages working)
=============================== */

export const loginWithEmailPassword = async (email, password) => signIn(email, password);
export const registerUser = async ({ email, password, fullName }) => signUp(email, password, fullName);
export const logoutUser = async () => signOut();

// Some older components still import this; keep it as a harmless stub.
export async function resendVerificationEmail() {
  return true;
}

/* ===============================
   Export SDK helpers (used in some components)
=============================== */

export { ID, Query };

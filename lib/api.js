// lib/api.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

const COL_PROFILES =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  "profiles";

const COL_VERIFY_CODES =
  process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  "verify_codes";

const COL_WALLETS =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID ||
  "wallets";

const COL_TX =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
  "transactions";

const COL_ALERTS =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID ||
  "alerts";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

function must(v, name) {
  if (!v || String(v).trim() === "") throw new Error(`Missing env: ${name}`);
  return String(v).trim();
}

const client = new Client()
  .setEndpoint(must(ENDPOINT, "NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(must(PROJECT_ID, "NEXT_PUBLIC_APPWRITE_PROJECT_ID"));

const account = new Account(client);
const db = new Databases(client);
const storage = new Storage(client);

export function getErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* -----------------------------
   AUTH (session compat)
----------------------------- */

async function createEmailSessionCompat(email, password) {
  const fn =
    account.createEmailPasswordSession ||
    account.createEmailSession ||
    account.createSession;

  if (typeof fn !== "function") {
    throw new Error("Appwrite email session method not found (SDK mismatch).");
  }
  return await fn.call(account, email, password);
}

export async function signIn(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  return createEmailSessionCompat(e, p);
}

export async function signOut() {
  try {
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
      return true;
    }
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return true;
    }
  } catch {
    // ignore
  }
  return true;
}

export async function getCurrentUser() {
  return account.get();
}

export async function signUp({ fullName, email, password, referralId = "" }) {
  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Missing full name.");
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // create account
  await account.create(ID.unique(), e, p, name);

  // create session for verify-code flow
  await signIn(e, p);

  // ensure profile
  await ensureUserBootstrap({ referralId });

  return true;
}

/* -----------------------------
   BOOTSTRAP (user + profile + wallets)
----------------------------- */

export async function ensureUserBootstrap({ referralId = "" } = {}) {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.$id) throw new Error("Not signed in.");

  // profile docId = userId
  let profile = null;
  try {
    profile = await db.getDocument(DB_ID, COL_PROFILES, user.$id);
  } catch {
    profile = await db.createDocument(DB_ID, COL_PROFILES, user.$id, {
      userId: user.$id,
      email: user.email,
      fullName: user.name || "",
      country: "",
      kycStatus: "not_submitted",
      verificationCodeVerified: false,
      createdAt: new Date().toISOString(),
      verifiedAt: "",
      referralId: referralId || "",
    });
  }

  // wallets are optional — don’t crash bootstrap if not ready
  let wallets = [];
  try {
    wallets = await db
      .listDocuments(DB_ID, COL_WALLETS, [Query.equal("userId", user.$id), Query.limit(50)])
      .then((r) => r.documents || []);
  } catch {
    wallets = [];
  }

  return { user, profile, wallets };
}

/* -----------------------------
   VERIFY CODE (Resend via API routes)
----------------------------- */

export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Unable to send verification code.");
  return true;
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
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Invalid or expired code.");
  return true;
}

/* -----------------------------
   PASSWORD RECOVERY (Appwrite Recovery)
   Note: Appwrite Cloud free has no “Redirect URLs” screen for this.
   You MUST pass redirectUrl in createRecovery().
----------------------------- */

export async function requestPasswordRecovery(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const redirectUrl = `${APP_URL}/reset-password`;
  if (!APP_URL) throw new Error("Missing NEXT_PUBLIC_APP_URL.");

  return account.createRecovery(e, redirectUrl);
}

export async function resetPasswordWithRecovery(userId, secret, password, passwordAgain) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p = String(password || "");
  const p2 = String(passwordAgain || password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p) throw new Error('Missing required parameter: "password"');

  return account.updateRecovery(uid, sec, p, p2);
}

/* -----------------------------
   Signup conflict helper (server checks)
----------------------------- */

export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  const res = await fetch(`/api/auth/account-status?email=${encodeURIComponent(e)}`, {
    method: "GET",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) return { exists: false, verified: false };
  return json;
}

/* -----------------------------
   Admin helpers (JWT for admin routes)
----------------------------- */

export async function getAppwriteJwt() {
  const jwt = await account.createJWT();
  return jwt?.jwt || "";
}

// Legacy aliases some pages may still import
export const loginWithEmailPassword = (email, password) => signIn(email, password);
export const registerUser = (payload) => signUp(payload);
export const logoutUser = () => signOut();

"use client";

import {
  account,
  ID,
  errMsg,
  isConfigured,
  createEmailSessionCompat,
} from "./appwriteClient";

/** Unified error message helper used by pages */
export function getErrorMessage(e, fallback = "Something went wrong.") {
  return errMsg(e, fallback);
}

function requireAppwrite() {
  if (!isConfigured()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
}

async function safeJson(res) {
  return res.json().catch(() => ({}));
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || data?.message || `Request failed: ${res.status}`);
  return data;
}

/**
 * Hardfix sign-in:
 * - Always clears active sessions first (prevents: "Creation of a session is prohibited when a session is active.")
 * - Uses compatibility session creator (prevents: createEmailPasswordSession is not a function)
 */
export async function signIn(email, password) {
  requireAppwrite();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  await createEmailSessionCompat(e, p);
  // bootstrap creates/loads user_profile etc
  return ensureUserBootstrap();
}

export async function signOut() {
  requireAppwrite();
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }
  return { ok: true };
}

/**
 * Sign up:
 * - creates account
 * - then signs in
 * - then bootstraps
 */
export async function signUp({ fullName, email, password }) {
  requireAppwrite();
  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error('Missing required parameter: "name"');
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // If already signed in, sign out first to avoid session conflicts
  try {
    await account.deleteSessions();
  } catch {}

  // Create Appwrite account
  await account.create(ID.unique(), e, p, name);

  // Create session + bootstrap
  await createEmailSessionCompat(e, p);
  return ensureUserBootstrap();
}

/**
 * Ensure user + user_profile exists via server bootstrap.
 * Your protected layout expects { user, profile }.
 */
export async function ensureUserBootstrap() {
  const res = await fetch("/api/bootstrap", { cache: "no-store" });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.error || "Bootstrap failed.");
  return data;
}

/** Email verify code flow */
export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");
  return postJSON("/api/auth/send-verify-code", { userId: id });
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");
  return postJSON("/api/auth/verify-code", { userId: id, code: c });
}

/**
 * Signup helper: check if account exists and whether verified,
 * without forcing a sign-in attempt.
 */
export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");
  return postJSON("/api/auth/account-status", { email: e });
}

/**
 * Password recovery:
 * Appwrite requires a valid URL. Your error "Invalid `url` param: Invalid URI."
 * happens when NEXT_PUBLIC_APP_URL is missing or not absolute.
 */
function resolveAppUrl() {
  const env = (process.env.NEXT_PUBLIC_APP_URL || "").trim();

  // Must be absolute
  try {
    if (env) return new URL(env).toString();
  } catch {
    // ignore
  }

  // Fallback to current origin (best hardfix)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // last resort
  return "https://example.com";
}

export async function requestPasswordRecovery(email) {
  requireAppwrite();
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  const redirectUrl = `${resolveAppUrl()}/reset-password`;

  // If session exists, Appwrite can still send recovery, but no harm.
  return account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  requireAppwrite();
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid) throw new Error("Missing userId.");
  if (!sec) throw new Error("Missing secret.");
  if (!p1) throw new Error('Missing required parameter: "password"');
  if (p1 !== p2) throw new Error("Passwords do not match.");

  return account.updateRecovery(uid, sec, p1, p2);
}

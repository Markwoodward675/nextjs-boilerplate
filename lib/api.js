// lib/api.js
"use client";

import { ID } from "appwrite";
import { getAccount, isAppwriteConfigured, getPublicConfig } from "./appwriteClient";
import { ENV } from "./appwrite";

export function getErrorMessage(e, fallback = "Something went wrong.") {
  const msg =
    e?.message ||
    e?.response?.message ||
    e?.response?.error ||
    fallback;
  return String(msg);
}

function getAppUrl() {
  const envUrl = String(ENV.APP_URL || "").trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  // final fallback (avoids Invalid URI)
  return "https://day-trader-insights.com";
}

async function safeDeleteSessions() {
  try {
    const account = getAccount();
    await account.deleteSessions();
  } catch {
    // ignore
  }
}

/**
 * Appwrite v13 expects: account.createEmailPasswordSession(email, password)
 * We NEVER destructure methods to avoid "bind" crash.
 */
export async function createEmailSessionCompat(email, password) {
  const account = getAccount();

  // If any session exists, Appwrite can refuse. You want it to still work:
  await safeDeleteSessions();

  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }

  // Fallback (older SDKs)
  if (typeof account.createSession === "function") {
    // Some versions use provider-based sessions; this might not exist for email in your SDK.
    return account.createSession(email, password);
  }

  throw new Error("Appwrite SDK mismatch: createEmailPasswordSession is not available.");
}

export async function signOut() {
  const account = getAccount();
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }
}

export async function signIn(email, password) {
  if (!isAppwriteConfigured()) {
    throw new Error("Appwrite is not configured.");
  }
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  await createEmailSessionCompat(e, p);
  return true;
}

export async function signUp({ fullName, email, password, referralId = "" }) {
  if (!isAppwriteConfigured()) {
    throw new Error("Appwrite is not configured.");
  }

  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error('Missing required parameter: "fullName"');
  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  const account = getAccount();

  try {
    await account.create(ID.unique(), e, p, name);

    // create session immediately
    await createEmailSessionCompat(e, p);

    // bootstrap will create user_profile doc + wallets
    await ensureUserBootstrap({ referralId });

    return true;
  } catch (err) {
    const msg = getErrorMessage(err, "Unable to create account.");

    // Appwrite 409 - existing user
    if (String(err?.code) === "409" || /already exists/i.test(msg)) {
      const e2 = new Error("USER_EXISTS");
      e2.code = 409;
      throw e2;
    }

    throw err;
  }
}

/**
 * Bootstrap (server route) – returns { ok, user, profile, userId }
 */
export async function ensureUserBootstrap(extra = {}) {
  const res = await fetch("/api/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(extra || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Bootstrap failed.");
  }
  return data;
}

/**
 * Verify Code API routes (Resend)
 */
export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ userId: id }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Unable to send code.");
  return true;
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ userId: id, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Invalid or expired code.");

  // Refresh bootstrap so protected layout sees verified=true
  await ensureUserBootstrap();

  return true;
}

/**
 * Password recovery (Appwrite)
 * - Appwrite Cloud free doesn't show "Redirect URLs" under Auth.
 * - For recovery you just pass a valid absolute URL (must be https://...).
 */
export async function sendRecoveryEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const url = `${getAppUrl()}/reset-password`;
  const account = getAccount();
  await account.createRecovery(e, url);
  return true;
}

export async function completePasswordRecovery({ userId, secret, password }) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pass = String(password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!pass || pass.length < 8) throw new Error("Password must be at least 8 characters.");

  const account = getAccount();

  // v13: updateRecovery(userId, secret, password, passwordAgain)
  if (typeof account.updateRecovery === "function") {
    await account.updateRecovery(uid, sec, pass, pass);
    return true;
  }

  throw new Error("Appwrite SDK mismatch: updateRecovery is not available.");
}

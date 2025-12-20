// lib/appwrite.js
"use client";

export {
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
  ENUM,
  isConfigured,
  isAppwriteConfigured,
  getPublicConfig,
  requireClient,
  client,
  account,
  db,
  storage,
  errMsg,
  requireSession,
  ID,
  Query,
} from "./appwriteClient";

/**
 * Compatibility helpers (fixes “a.createEmailPasswordSession is not a function”
 * and “Creation of a session is prohibited when a session is active.”)
 */

import { requireClient, errMsg } from "./appwriteClient";

export async function createEmailSessionCompat(email, password) {
  const { account } = requireClient();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  // HARD FIX: Appwrite can refuse creating a session if one is already active
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }

  // SDK method name differs between versions
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(e, p);
  }
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(e, p);
  }

  throw new Error(
    "Your Appwrite SDK does not support email sessions. Update the `appwrite` npm package."
  );
}

export function getAppUrl() {
  // Must be a valid absolute URL for recovery flow
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    "";

  if (fromEnv) {
    // If someone set VERCEL_URL without https://
    if (/^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/$/, "");
    return `https://${fromEnv}`.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // last resort
  return "";
}

export async function requestPasswordRecoveryCompat(email) {
  const { account } = requireClient();
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const base = getAppUrl();
  if (!base) throw new Error("App URL not configured. Set NEXT_PUBLIC_APP_URL.");

  const redirect = `${base}/reset-password`;
  try {
    return await account.createRecovery(e, redirect);
  } catch (er) {
    throw new Error(errMsg(er, "Unable to send recovery email."));
  }
}

export async function completePasswordRecoveryCompat(userId, secret, password, passwordAgain) {
  const { account } = requireClient();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1 || p1.length < 8) throw new Error("Password must be at least 8 characters.");
  if (p1 !== p2) throw new Error("Passwords do not match.");

  try {
    return await account.updateRecovery(uid, sec, p1, p2);
  } catch (er) {
    throw new Error(errMsg(er, "Unable to reset password."));
  }
}

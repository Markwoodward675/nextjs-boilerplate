"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/**
 * Public (client) Appwrite config.
 * Uses ONLY NEXT_PUBLIC_* env vars.
 */

export const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
export const PROJECT_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();

// Prefer DATABASE_ID, fallback to DB_ID (you have both in Vercel)
export const DB_ID = (
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DBID ||
  ""
).trim();

export const BUCKET_ID = (process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "").trim();

// Collections (single source of truth)
// user_profile is the canonical one (your request)
export const COL = {
  USER_PROFILE: (
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    "user_profile"
  ).trim(),

  WALLETS: (process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets").trim(),
  TRANSACTIONS: (process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions").trim(),
  ALERTS: (process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts").trim(),
  AFFILIATE_ACCOUNTS: (
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_accounts"
  ).trim(),

  VERIFY_CODES: (
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COL ||
    "verify_codes"
  ).trim(),
};

// Enums used by pages (so imports stop failing)
export const ENUM = {
  KYC: {
    NOT_SUBMITTED: "not_submitted",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
  TX: {
    DEPOSIT: "deposit",
    WITHDRAW: "withdraw",
    INVEST: "invest",
    TRADE: "trade",
    BONUS: "bonus",
  },
};

// Create SDK objects
export const client = new Client();
if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

// Export ID/Query for pages that import them
export { ID, Query };

// Config helpers
export function getPublicConfig() {
  return {
    ENDPOINT,
    PROJECT_ID,
    DB_ID,
    BUCKET_ID,
    COL,
  };
}

export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

// Backwards-compat name used in your repo logs
export function isAppwriteConfigured() {
  return isConfigured();
}

// Error helper used all over
export function errMsg(err, fallback = "Something went wrong.") {
  try {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    const m =
      err?.message ||
      err?.response?.message ||
      err?.response?.error ||
      err?.error ||
      "";
    return String(m || fallback);
  } catch {
    return fallback;
  }
}

// Throw if config missing
export function requireClient() {
  if (!isConfigured()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  return { client, account, db, storage, ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ENUM, ID, Query };
}

// Session helpers
export async function requireSession() {
  requireClient();
  try {
    const me = await account.get();
    return me;
  } catch (e) {
    throw new Error(errMsg(e, "Not signed in."));
  }
}

/**
 * COMPAT: Appwrite SDK method names differ by version.
 * Newer: account.createEmailPasswordSession
 * Older: account.createEmailSession
 */
export async function createEmailSessionCompat(email, password) {
  requireClient();

  // If a session exists, Appwrite throws "Creation of a session is prohibited when a session is active."
  // Hardfix: clear sessions first.
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }

  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }

  throw new Error(
    "Your Appwrite SDK is missing email session methods. Update the 'appwrite' package."
  );
}

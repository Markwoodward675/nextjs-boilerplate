"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/**
 * Public config (client-side)
 * You MUST set these in Vercel env:
 * - NEXT_PUBLIC_APPWRITE_ENDPOINT
 * - NEXT_PUBLIC_APPWRITE_PROJECT_ID
 * - NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)
 */
export const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT ||
  "";

export const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT_ID ||
  "";

export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
  process.env.APPWRITE_DATABASE_ID ||
  "";

/**
 * Collections (single source of truth = user_profile)
 * Override via env if your IDs differ.
 */
export const COL = {
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_USER_PROFILE_COLLECTION_ID ||
    "user_profile",

  VERIFY_CODES:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    "verify_codes",

  WALLETS:
    process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",

  TRANSACTIONS:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",

  ALERTS:
    process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",

  AFFILIATE_ACCOUNTS:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COLLECTION_ID || "affiliate_accounts",

  AFFILIATE_COMMISSIONS:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID || "affiliate_commissions"
};

// If you use enums in your UI, keep them here.
export const ENUM = {
  KYC_STATUS: ["not_submitted", "pending", "approved", "rejected"]
};

export const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ||
  "";

// --- helpers ---
export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}
export const isAppwriteConfigured = isConfigured; // alias used in some files

export function getPublicConfig() {
  return {
    ENDPOINT,
    PROJECT_ID,
    DB_ID,
    BUCKET_ID,
    COL
  };
}

export function errMsg(e, fallback = "Something went wrong.") {
  const msg =
    e?.message ||
    e?.response?.message ||
    e?.response ||
    e?.error ||
    "";
  return String(msg || fallback);
}

// --- Appwrite SDK instances ---
export const client = new Client();

if (isConfigured()) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };

// Back-compat names some code expects:
export function requireClient() {
  if (!isConfigured()) {
    throw new Error("Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.");
  }
  return client;
}

export async function requireSession() {
  // throws if not signed in
  return await account.get();
}

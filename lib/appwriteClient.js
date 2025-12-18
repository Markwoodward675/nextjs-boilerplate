// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/**
 * Env resolution (client-safe)
 * - Accepts the various names you listed, plus older ones we used earlier.
 */
export const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT ||
  "";

export const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT_ID ||
  "";

// DB id can be in either var name
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  "";

// Single bucket for uploads
export const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ||
  "";

/**
 * Collections: prefer explicit envs, fallback to your actual collection names.
 * NOTE: you said single source of truth is user_profile.
 */
export const COL = {
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    process.env.APPWRITE_USERS_COLLECTION_ID ||
    "user_profile",

  VERIFY_CODES:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    "verify_codes",

  PROFILES:
    process.env.APPWRITE_PROFILES_COLLECTION_ID ||
    "profiles",

  WALLETS:
    process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID ||
    "wallets",

  TRANSACTIONS:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
    "transactions",

  ALERTS:
    process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID ||
    "alerts",

  AFFILIATE_ACCOUNT:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID ||
    "affiliate_account",

  AFFILIATE_REFERRALS:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_REFERRALS_COLLECTION_ID ||
    "affiliate_referrals",

  AFFILIATE_COMMISSIONS:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID ||
    "affiliate_commissions",
};

/**
 * ENUMs you specified
 */
export const ENUM = {
  transactions: {
    currencyType: ["USD", "EUR", "JPY", "GBP"],
    transactionType: [
      "deposit",
      "withdraw",
      "transfer",
      "refund",
      "invest",
      "trade",
      "giftcard_buy",
      "giftcard_sell",
      "admin_adjustment",
      "commission",
    ],
  },
  alerts: {
    severity: ["low", "medium", "high", "critical"],
  },
};

/**
 * Appwrite client singletons
 */
export const client = new Client();

if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function errMsg(e, fallback = "Something went wrong.") {
  const m =
    e?.message ||
    e?.response?.message ||
    e?.response?.data?.message ||
    (typeof e === "string" ? e : "");
  return String(m || fallback);
}

/**
 * Convenience: returns the client objects (for debug pages)
 */
export function requireClient() {
  if (!isConfigured()) throw new Error("Appwrite is not configured (missing ENDPOINT/PROJECT_ID).");
  return { client, account, db, storage, ID, Query, ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ENUM };
}

/**
 * Convenience: ensure there is an active session and return user
 */
export async function requireSession() {
  if (!isConfigured()) throw new Error("Appwrite is not configured (missing ENDPOINT/PROJECT_ID).");
  const u = await account.get();
  if (!u?.$id) throw new Error("No active session.");
  return u;
}

/**
 * Public config for UI/debug (kept client-safe)
 */
export function getPublicConfig() {
  return { ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ENUM };
}

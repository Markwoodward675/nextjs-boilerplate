"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/** Public env */
export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

/**
 * DB env names you have across the repo:
 * - NEXT_PUBLIC_APPWRITE_DATABASE_ID
 * - NEXT_PUBLIC_APPWRITE_DB_ID
 * - NEXT_PUBLIC_APPWRITE_DATABASE (fallback)
 */
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
  "";

/** Storage bucket */
export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

/** Collections (public IDs) */
export const COL = {
  // single source of truth profile:
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    process.env.APPWRITE_USERS_COLLECTION_ID ||
    "user_profile",

  WALLETS: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
  TRANSACTIONS:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
  ALERTS: process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
  VERIFY_CODES:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    "verify_codes",
  AFFILIATE_ACCOUNTS:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID ||
    "affiliate_accounts",
};

/** Enums used by pages (add more later if needed) */
export const ENUM = {
  KYC_STATUS: {
    NOT_SUBMITTED: "not_submitted",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
};

/** Config checks */
export const isConfigured = () => Boolean(ENDPOINT && PROJECT_ID);
export const getPublicConfig = () => ({
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
});

/** Client singletons */
export const client = new Client();

if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

/** Error message helper used by many pages */
export function errMsg(e, fallback = "Something went wrong.") {
  const raw =
    e?.message ||
    e?.response?.message ||
    e?.response ||
    e?.error ||
    e?.toString?.() ||
    "";
  const msg = String(raw || "").trim();
  return msg || fallback;
}

/** Back-compat helper imports some pages expect */
export function requireClient() {
  if (!isConfigured()) throw new Error("Appwrite not configured (missing endpoint/project).");
  return { client, account, db, storage, ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID };
}

/** Require an active session (client-side) */
export async function requireSession() {
  try {
    const me = await account.get();
    if (!me?.$id) throw new Error("Not signed in.");
    return me;
  } catch (e) {
    throw new Error(errMsg(e, "Not signed in."));
  }
}

export { ID, Query };

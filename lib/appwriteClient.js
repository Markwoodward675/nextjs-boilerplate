// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "Daytrader_main";

export const COLLECTIONS = {
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_USER_PROFILE_COLLECTION_ID ||
    "user_profile",
  VERIFY_CODES:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    "verify_codes",
};

export const client = new Client();
export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export const ENUM = {
  kycStatus: {
    NOT_SUBMITTED: "not_submitted",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
};

export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID && DB_ID);
}

export function getPublicConfig() {
  return { ENDPOINT, PROJECT_ID, DB_ID, COLLECTIONS, configured: isConfigured() };
}

// Safe init (never throw at import-time)
(function init() {
  try {
    if (ENDPOINT) client.setEndpoint(ENDPOINT);
    if (PROJECT_ID) client.setProject(PROJECT_ID);
  } catch {
    // ignore
  }
})();

export function requireClient() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite client not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  return { client, account, db, storage, ID, Query };
}

export function errMsg(e, fallback = "Something went wrong.") {
  const msg =
    e?.message ||
    e?.response?.message ||
    e?.response ||
    e?.toString?.() ||
    "";
  const s = String(msg).trim();
  return s || fallback;
}

export async function requireSession() {
  try {
    const me = await account.get();
    if (!me?.$id) throw new Error("No active session.");
    return me;
  } catch (e) {
    throw new Error(errMsg(e, "Please sign in again."));
  }
}

export { ID, Query };

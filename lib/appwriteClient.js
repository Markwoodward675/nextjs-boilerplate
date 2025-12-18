"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/** ---------------------------
 * Public env (browser)
 * -------------------------- */
export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

// DB ID supports both names you have in Vercel
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID || // (duplicate safety)
  "";

// Collections (single source of truth: user_profile)
export const COL = {
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    process.env.APPWRITE_PROFILES_COLLECTION_ID ||
    "user_profile",

  WALLETS: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
  TRANSACTIONS:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
  ALERTS: process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
  AFFILIATE:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID ||
    "affiliate_accounts",
};

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

/** ---------------------------
 * Enums (used around the app)
 * -------------------------- */
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

/** ---------------------------
 * SDK singletons
 * -------------------------- */
let _client = null;
let _account = null;
let _db = null;
let _storage = null;

function initIfPossible() {
  if (_client) return;
  if (!ENDPOINT || !PROJECT_ID) return;

  _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  _account = new Account(_client);
  _db = new Databases(_client);
  _storage = new Storage(_client);
}

export function isConfigured({ requireDb = false } = {}) {
  initIfPossible();
  if (!ENDPOINT || !PROJECT_ID) return false;
  if (requireDb && !DB_ID) return false;
  return true;
}

export function getPublicConfig() {
  return {
    ENDPOINT,
    PROJECT_ID,
    DB_ID,
    BUCKET_ID,
    COL,
  };
}

export function errMsg() {
  if (!ENDPOINT || !PROJECT_ID) {
    return "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.";
  }
  if (!DB_ID) {
    return "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_DB_ID.";
  }
  return "Appwrite is configured.";
}

export function requireClient({ requireDb = false } = {}) {
  initIfPossible();

  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  if (requireDb && !DB_ID) {
    throw new Error(
      "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID or NEXT_PUBLIC_APPWRITE_DB_ID."
    );
  }
  if (!_account || !_db || !_storage) {
    throw new Error("Appwrite client failed to initialize (SDK objects missing).");
  }

  return { client: _client, account: _account, db: _db, storage: _storage };
}

export async function requireSession() {
  const { account } = requireClient();
  const user = await account.get().catch(() => null);
  if (!user?.$id) throw new Error("No active session.");
  return user;
}

// Export SDK objects (pages/components import these directly)
export const client = (initIfPossible(), _client);
export const account = (initIfPossible(), _account);
export const db = (initIfPossible(), _db);
export const storage = (initIfPossible(), _storage);

// ✅ IMPORTANT: these must be exported (your build complained)
export { ID, Query };

"use client";

import { ID, Query, Permission, Role } from "appwrite";
import { getAppwrite, ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID } from "./appwriteClient";

export { ENDPOINT, PROJECT_ID, DB_ID };

// Collections (prefer NEXT_PUBLIC names, fallback to your known IDs/names)
export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  "user_profile";

export const PROFILES_COLLECTION_ID =
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  "profiles";

export const VERIFY_CODES_COLLECTION_ID =
  process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
  "verify_codes";

export const WALLETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

export const TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

export const ALERTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";

export const AFFILIATE_ACCOUNT_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account";

export const AFFILIATE_REFERRALS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_REFERRALS_COLLECTION_ID || "affiliate_referrals";

export const AFFILIATE_COMMISSIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID || "affiliate_commissions";

export const PROFILE_PICS_BUCKET_ID = BUCKET_ID || "";

export const ENUM = {
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
  alertSeverity: ["low", "medium", "high", "critical"],
};

export const QueryHelper = Query;
export const IDHelper = ID;

export { Permission, Role };

export function isDbConfigured() {
  return Boolean(DB_ID);
}

export function requireDbConfigured() {
  if (!DB_ID) {
    throw new Error(
      "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }
}

export function getSdk() {
  return getAppwrite();
}

export const account = {
  get: () => getAppwrite().account.get(),
  create: (...args) => getAppwrite().account.create(...args),
  deleteSession: (...args) => getAppwrite().account.deleteSession(...args),
  createRecovery: (...args) => getAppwrite().account.createRecovery(...args),
  updateRecovery: (...args) => getAppwrite().account.updateRecovery(...args),

  // compat wrapper exported from lib/api.js (don’t call here)
};

export const databases = {
  getDocument: (...args) => getAppwrite().db.getDocument(...args),
  createDocument: (...args) => getAppwrite().db.createDocument(...args),
  updateDocument: (...args) => getAppwrite().db.updateDocument(...args),
  listDocuments: (...args) => getAppwrite().db.listDocuments(...args),
};

export const storage = {
  createFile: (...args) => getAppwrite().storage.createFile(...args),
};

// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

// DB is only available client-side via NEXT_PUBLIC vars
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

// Collections (single source of truth = user_profile)
export const COL = {
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile",
  VERIFY_CODES:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes",
  WALLETS:
    process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
  TRANSACTIONS:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
  ALERTS:
    process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
  AFFILIATE_ACCOUNT:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID ||
    "affiliate_account",
};

// Enums you specified
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

export function errMsg(e, fallback = "Something went wrong.") {
  if (!e) return fallback;

  // AppwriteException often has message/code/type/response
  const msg =
    e?.message ||
    e?.response?.message ||
    e?.response ||
    e?.toString?.() ||
    "";

  const clean = String(msg).trim();
  return clean || fallback;
}

export const client = new Client();

if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };

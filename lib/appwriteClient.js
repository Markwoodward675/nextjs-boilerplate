// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

// Collection IDs (prefer NEXT_PUBLIC ones)
export const COL = {
  USER_PROFILE: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile",
  VERIFY_CODES: process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes",
  WALLETS: process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
  TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
  ALERTS: process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
  AFFILIATE_ACCOUNT: process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account",
};

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

export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function errMsg() {
  if (!ENDPOINT) return "Missing NEXT_PUBLIC_APPWRITE_ENDPOINT.";
  if (!PROJECT_ID) return "Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID.";
  if (!DB_ID) return "Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DB_ID).";
  return "";
}

export const client = new Client();
if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

// Appwrite SDK compatibility helper (NO .bind anywhere)
export async function createEmailSessionCompat(email, password) {
  // Newer SDK: createEmailSession
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  // Older SDK: createEmailPasswordSession
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  throw new Error("Unsupported Appwrite SDK: missing email session method.");
}

export async function requireSession() {
  return account.get();
}

export function getPublicConfig() {
  return { ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ENUM };
}

export function requireClient() {
  if (!isConfigured()) throw new Error(errMsg());
  return { client, account, db, storage };
}

export { ID, Query };

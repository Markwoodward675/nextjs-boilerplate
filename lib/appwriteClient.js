"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

function pick(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export const ENDPOINT = pick(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
export const PROJECT_ID = pick(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

// DB + Bucket (support all the env names you listed)
export const DB_ID = pick(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID
);

export const BUCKET_ID = pick(process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID);

// Collections (public IDs)
export const COL = {
  user_profile: pick(process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID, "user_profile"),
  wallets: pick(process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID, "wallets"),
  transactions: pick(process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID, "transactions"),
  alerts: pick(process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID, "alerts"),
  affiliate: pick(process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID, "affiliate_accounts"),

  // verify_codes is used only by server routes, but keeping a default won’t hurt
  verify_codes: "verify_codes",
};

export const client = new Client();
if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };

export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function errMsg(e, fallback = "Something went wrong.") {
  const m =
    e?.message ||
    e?.response?.message ||
    e?.response ||
    e?.type ||
    fallback;
  return String(m);
}

export async function requireSession() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

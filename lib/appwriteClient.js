// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const PROJECT_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();

// ✅ Read DB from either name (your Vercel might have one or the other)
const DB_ID =
  (process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "").trim() ||
  (process.env.NEXT_PUBLIC_APPWRITE_DB_ID || "").trim() ||
  "";

// ✅ Collections (match your real Appwrite collections)
export const COL = {
  PROFILES: (process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles").trim(),
  WALLETS: (process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets").trim(),
  TX: (process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions").trim(),
  ALERTS: (process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts").trim(),
  VERIFY_CODES: (process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes").trim(),
};

export const BUCKET_ID = (process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads").trim();

// ✅ Never throw at import-time. Pages should render and show a friendly message.
export const isAppwriteConfigured = Boolean(
  ENDPOINT && ENDPOINT.startsWith("http") && PROJECT_ID
);

export const isDbConfigured = Boolean(DB_ID);

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };
export { DB_ID };

export function errMsg(e, fallback = "Something went wrong.") {
  return String(e?.message || e?.response?.message || fallback).replace(
    /^AppwriteException:\s*/i,
    ""
  );
}

// Used by protected pages
export async function requireSession() {
  if (!isAppwriteConfigured) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  const user = await account.get().catch(() => null);
  if (!user?.$id) throw new Error("Please sign in to continue.");
  return user;
}

// Optional helper used by UI (instead of throwing at import)
export function getConfigStatus() {
  return {
    ENDPOINT,
    PROJECT_ID,
    DB_ID,
    isAppwriteConfigured,
    isDbConfigured,
    collections: COL,
  };
}

if (typeof window !== "undefined") {
  console.log("[AppwriteClient config]", {
    endpointConfigured: Boolean(ENDPOINT),
    projectConfigured: Boolean(PROJECT_ID),
    dbConfigured: Boolean(DB_ID),
    DB_ID_preview: DB_ID ? DB_ID.slice(0, 6) + "…" : "",
    collections: COL,
  });
}

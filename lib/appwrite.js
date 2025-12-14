"use client";

import {
  Client,
  Account,
  Databases,
  Storage,
  ID,
  Query,
  Permission,
  Role,
} from "appwrite";

// Public env vars (browser-safe)
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID_ENV = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Required IDs (recommended to set in env)
export const DB_ID = DB_ID_ENV && DB_ID_ENV.trim() !== "" ? DB_ID_ENV : "";

// Collections
export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";
export const WALLETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

// Buckets
export const PROFILE_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILE_BUCKET_ID || "";
export const KYC_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_KYC_BUCKET_ID || "";

// Client init
const client = new Client();

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  if (typeof window !== "undefined") {
    console.warn("[Day Trader] Missing Appwrite env vars:", { ENDPOINT, PROJECT_ID });
  }
}

// SDK instances (singletons)
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Helpers
export const IDHelper = ID;
export const QueryHelper = Query;

export { Permission, Role };

"use client";

import {
  Client,
  Account,
  Databases,
  ID,
  Query,
  Permission,
  Role,
} from "appwrite";

// Public env vars for browser usage
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID_ENV = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Fallback DB ID if env is missing (you can rename this to match Appwrite)
export const DB_ID =
  DB_ID_ENV && DB_ID_ENV.trim() !== "" ? DB_ID_ENV : "Daytrader_main";

const client = new Client();

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  if (typeof window !== "undefined") {
    console.warn("[Day Trader] Appwrite endpoint/project env vars are missing.", {
      ENDPOINT,
      PROJECT_ID,
    });
  }
}

// Core SDK instances – this is the ONLY place we create them
export const account = new Account(client);
export const databases = new Databases(client);

// Re-export some helpers so other files can use them without re-importing appwrite
export { ID, Query, Permission, Role };

// Optional: collection IDs (you can also move these to env vars)
export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "users";

export const WALLETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

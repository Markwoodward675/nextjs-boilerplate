// lib/appwrite.js
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

// Fallback DB ID if env is missing
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

// Helpers used by lib/api.js and pages
// ID has static helpers like ID.unique(), ID.custom()
export const IDHelper = ID;
// Query has static helpers like Query.equal(), Query.limit(), etc.
export const QueryHelper = Query;

export { Permission, Role };

// Optional: collection IDs (you can move to env if you want)
export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";
export const WALLETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

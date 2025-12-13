// lib/appwrite.js
"use client";

import {
  Client,
  Account,
  Databases,
  Functions,
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

// Core SDK instances – ONLY place we create them
export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

// Helpers
export const IDHelper = ID;
export const QueryHelper = Query;

export { Permission, Role };

// Collection IDs (env override + safe defaults)
export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";

export const WALLETS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

export const TRANSACTIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

export const ALERTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";

export const AFFILIATE_ACCOUNTS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNTS_COLLECTION_ID ||
  "affiliate_account";

export const AFFILIATE_REFERRALS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_REFERRALS_COLLECTION_ID ||
  "affiliate_referrals";

export const AFFILIATE_COMMISSIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID ||
  "affiliate_commissions";

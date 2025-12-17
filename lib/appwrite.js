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

export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";
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

export const PROFILE_PICS_BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICS_BUCKET_ID || "profile_pics";

const client = new Client();

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  if (typeof window !== "undefined") {
    console.warn("[Day Trader] Missing Appwrite env vars", { ENDPOINT, PROJECT_ID });
  }
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const IDHelper = ID;
export const QueryHelper = Query;
export { Permission, Role };

if (typeof window !== "undefined") {
  console.log("ENV CHECK:", {
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  });
}

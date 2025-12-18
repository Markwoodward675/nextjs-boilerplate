// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

export { ID, Query };

export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// prefer DB vars you listed (both exist in your env)
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";

// Collection IDs
export const COL = {
  user_profile:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile",
  verify_codes:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes",
  wallets:
    process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
  transactions:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
  alerts:
    process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
  affiliate_account:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account",
};

let _client, _account, _db, _storage;

export function isConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function requireClient() {
  if (!isConfigured()) {
    throw new Error("Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.");
  }
  if (!_client) {
    _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    _account = new Account(_client);
    _db = new Databases(_client);
    _storage = new Storage(_client);
  }
  return { client: _client, account: _account, db: _db, storage: _storage };
}

export const account = new Proxy(
  {},
  {
    get(_, prop) {
      return requireClient().account[prop];
    },
  }
);

export const db = new Proxy(
  {},
  {
    get(_, prop) {
      return requireClient().db[prop];
    },
  }
);

export const storage = new Proxy(
  {},
  {
    get(_, prop) {
      return requireClient().storage[prop];
    },
  }
);

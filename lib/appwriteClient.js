// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export function getPublicConfig() {
  return {
    endpoint: ENDPOINT,
    projectId: PROJECT_ID,
    databaseId:
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
      "",
    bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "",
    usersCollectionId:
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile",
    verifyCodesCollectionId:
      process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      "verify_codes",
    walletsCollectionId:
      process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",
    transactionsCollectionId:
      process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID ||
      "transactions",
    alertsCollectionId:
      process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : ""),
  };
}

export function requireClient() {
  const cfg = getPublicConfig();
  if (!cfg.endpoint || !cfg.projectId) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel."
    );
  }

  const client = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId);

  return {
    cfg,
    client,
    account: new Account(client),
    db: new Databases(client),
    storage: new Storage(client),
    ID,
    Query,
  };
}

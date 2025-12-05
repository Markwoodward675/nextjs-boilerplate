// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Fallback DB_ID to your real database ID if env is missing
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "Daytrader_main";

// Log what the frontend actually sees (only in the browser).
if (typeof window !== "undefined") {
  console.log("[Day Trader Appwrite config]", {
    ENDPOINT,
    PROJECT_ID,
    DB_ID,
  });
}

const client = new Client();

// Configure Appwrite client only if endpoint and project are present
if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  console.warn(
    "[Appwrite] Client not fully configured. Check NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel env."
  );
}

export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

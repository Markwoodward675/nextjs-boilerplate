// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

// Public env vars (Vercel → Settings → Environment Variables → NEXT_PUBLIC_*)
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID_ENV = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// If env is missing, fall back to your known DB ID from Appwrite console
// (You showed: Database ID = Daytrader_main)
export const DB_ID =
  DB_ID_ENV && DB_ID_ENV.trim() !== "" ? DB_ID_ENV : "Daytrader_main";

// Optional: log config in browser for debugging
if (typeof window !== "undefined") {
  console.log("[Day Trader Appwrite config]", {
    ENDPOINT,
    PROJECT_ID,
    DB_ID,
  });
}

const client = new Client();

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  console.warn(
    "[Appwrite] Client not fully configured. Check NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.",
    { ENDPOINT, PROJECT_ID }
  );
}

// Export instances + helpers used in lib/api.js
export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

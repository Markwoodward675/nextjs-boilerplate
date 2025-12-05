// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

// ---------------------------------------------------------------------------
// Environment configuration
// ---------------------------------------------------------------------------

// These should be set in Vercel → Project → Settings → Environment Variables
// for PRODUCTION:
//
// NEXT_PUBLIC_APPWRITE_ENDPOINT      = https://nyc.cloud.appwrite.io/v1
// NEXT_PUBLIC_APPWRITE_PROJECT_ID    = <your Appwrite project ID>
// NEXT_PUBLIC_APPWRITE_DATABASE_ID   = Daytrader_main
//
// To avoid breaking the app while envs are misconfigured, we add a fallback
// for DB_ID to "Daytrader_main" (your actual database ID).
// ---------------------------------------------------------------------------

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// IMPORTANT: fallback DB_ID to your real database ID if env is missing
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "Daytrader_main";

// TEMP: log what the frontend sees so you can confirm it's correct
// (You can remove this console.log later if you want.)
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
    "[Appwrite] Client not fully configured. Check NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
  );
}

// Exports used by lib/api.js
export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

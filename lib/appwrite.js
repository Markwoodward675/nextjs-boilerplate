// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

// Read environment variables from Vercel
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Use env DB_ID if set, otherwise fallback to your known database ID
let dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

if (!dbId) {
  console.warn(
    "[Appwrite] NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set. Falling back to 'Daytrader_main'. " +
      "For production, set NEXT_PUBLIC_APPWRITE_DATABASE_ID in your Vercel env vars."
  );
  dbId = "Daytrader_main";
}

export const DB_ID = dbId;

// Log what the frontend actually sees (debug only; you can remove later)
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
    "[Appwrite] Client not fully configured. Check NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in Vercel env."
  );
}

export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

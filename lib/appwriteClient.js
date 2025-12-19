// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Single source of truth for DB id on client
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID_ENV ||
  "";

if (!ENDPOINT || !PROJECT_ID) {
  // Don't throw at import-time (avoids build crash); throw in functions when needed.
  console.warn("[Appwrite] Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID");
}

export const client = new Client();

if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };

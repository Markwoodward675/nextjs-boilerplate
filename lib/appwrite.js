// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

// These MUST be defined in Vercel as Environment Variables
// and MUST start with NEXT_PUBLIC_ because this code runs in the browser.
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Basic safety checks so you get a clear error if something is missing
if (!ENDPOINT) {
  console.warn(
    "Appwrite endpoint is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT in your env."
  );
}
if (!PROJECT_ID) {
  console.warn(
    "Appwrite project ID is not configured. Set NEXT_PUBLIC_APPWRITE_PROJECT_ID in your env."
  );
}
if (!DB_ID) {
  console.warn(
    "Appwrite database ID is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID in your env."
  );
}

const client = new Client();

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

// Export the Appwrite SDK helpers used in lib/api.js
export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

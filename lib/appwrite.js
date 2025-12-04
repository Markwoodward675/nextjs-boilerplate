// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

// These MUST be set in Vercel → Project → Settings → Environment Variables
// and MUST start with NEXT_PUBLIC_ because this code runs in the browser.
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// For your setup, NEXT_PUBLIC_APPWRITE_ENDPOINT should be:
// https://nyc.cloud.appwrite.io/v1

const client = new Client();

// Only configure the client if we have the required values.
// If they are missing, we'll log a warning so it's visible in the console.
if (!ENDPOINT) {
  console.warn(
    "[Appwrite] NEXT_PUBLIC_APPWRITE_ENDPOINT is not set. " +
      "Set it to your Appwrite endpoint, e.g. https://nyc.cloud.appwrite.io/v1"
  );
}
if (!PROJECT_ID) {
  console.warn(
    "[Appwrite] NEXT_PUBLIC_APPWRITE_PROJECT_ID is not set. " +
      "Set it to your Appwrite project ID from the Appwrite console."
  );
}
if (!DB_ID) {
  console.warn(
    "[Appwrite] NEXT_PUBLIC_APPWRITE_DATABASE_ID is not set. " +
      "Set it to your Appwrite database ID."
  );
}

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  // This will still let the app render UI, but any Appwrite call will fail
  // until the env vars are correctly configured and redeployed.
  console.warn(
    "[Appwrite] Client is not fully configured. " +
      "Check your NEXT_PUBLIC_APPWRITE_* environment variables."
  );
}

// Export SDK helpers used by lib/api.js
export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

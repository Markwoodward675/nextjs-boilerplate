// lib/appwrite.js

import { Client, Account, Databases, ID, Query } from "appwrite";

/**
 * Appwrite client setup
 *
 * Uses public env vars so it can run in both browser (client components)
 * and on the server (Next.js route handlers / RSC).
 *
 * Make sure you have these set in Vercel:
 *
 *  NEXT_PUBLIC_APPWRITE_ENDPOINT   = https://cloud.appwrite.io/v1   (or your own endpoint)
 *  NEXT_PUBLIC_APPWRITE_PROJECT_ID = <your Appwrite project ID>
 *  NEXT_PUBLIC_APPWRITE_DB_ID      = Daytrader_main                (or your DB id)
 */

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  // This will show in browser console / server logs if something is missing
  console.warn(
    "[Appwrite] Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID. " +
      "Check your Vercel environment variables."
  );
}

client.setEndpoint(endpoint).setProject(projectId);

// Core SDK instances
export const account = new Account(client);
export const databases = new Databases(client);

// Helpers re-exported for convenience (used in lib/api.js and pages)
export const IDHelper = ID;
export const QueryHelper = Query;

// Database ID (Daytrader_main) from env
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// TEMP debug
console.log("[Appwrite config]", {
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
});

const client = new Client();

if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
} else {
  console.warn(
    "[Appwrite] Client not fully configured. Check NEXT_PUBLIC_APPWRITE_* env vars."
  );
}

export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

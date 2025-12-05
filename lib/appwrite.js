// lib/appwrite.js
"use client";

import { Client, Account, Databases, ID, Query, } from "appwrite";

// Public env vars
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID_ENV = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Fallback to your real DB ID
export const DB_ID =
  DB_ID_ENV && DB_ID_ENV.trim() !== "" ? DB_ID_ENV : "Daytrader_main";

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

export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

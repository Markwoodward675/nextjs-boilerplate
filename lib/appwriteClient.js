// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE;

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

const client = new Client();
if (ENDPOINT && PROJECT_ID) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export const account = new Account(client);

// NOTE: We do NOT hard-crash if DB_ID is missing.
// Only DB/Storage features require it.
export const db = DB_ID ? new Databases(client) : null;
export const storage = BUCKET_ID ? new Storage(client) : null;

export const APPWRITE_ENV = {
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
};

export { ID, Query };

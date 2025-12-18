// lib/appwriteAdmin.js
import "server-only";
export const runtime = "nodejs";

import { Client, Databases, Storage, Users } from "node-appwrite";

export function getAdmin() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
    "";

  const BUCKET_ID =
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || "";

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error(
      "Missing Appwrite admin env vars. Required: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID."
    );
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    DATABASE_ID,
    BUCKET_ID,
  };
}

// Back-compat name used in your routes:
export function getAdminClient() {
  return getAdmin();
}

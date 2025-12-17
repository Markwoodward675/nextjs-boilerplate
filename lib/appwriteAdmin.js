// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Storage, Users } from "node-appwrite";

export function getAdminClient() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  const DB_ID =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.APPWRITE_DB_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DB_ID) {
    throw new Error(
      "Missing admin env vars. Required: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID)."
    );
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    DB_ID,
  };
}

// Alias (some of your older code expects getAdmin)
export function getAdmin() {
  return getAdminClient();
}

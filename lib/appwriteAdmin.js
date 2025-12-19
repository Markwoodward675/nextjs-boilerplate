// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Users, Storage, ID, Query } from "node-appwrite";
export { ID, Query };

function readEnv() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error(
      "Missing Appwrite admin env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY."
    );
  }
  if (!DATABASE_ID) {
    throw new Error(
      "Missing Appwrite DB env var: APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID / NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }

  return { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID };
}

let _cached = null;

export function getAdmin() {
  if (_cached) return _cached;

  const { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID } = readEnv();

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  _cached = {
    client,
    db: new Databases(client),
    users: new Users(client),
    storage: new Storage(client),
    DATABASE_ID,
  };

  return _cached;
}

// Backwards-compatible alias used in your repo
export function getAdminClient() {
  return getAdmin();
}

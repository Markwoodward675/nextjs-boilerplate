// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Storage, Users, ID, Query } from "node-appwrite";

function getEnv() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error(
      "Missing Appwrite admin env vars. Need APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID."
    );
  }

  return { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID };
}

export function getAdmin() {
  const { ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID } = getEnv();

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
  };
}

// Backward-compatible alias used in some of your routes
export function getAdminClient() {
  const a = getAdmin();
  return {
    client: a.client,
    db: a.db,
    storage: a.storage,
    users: a.users,
    DB_ID: a.DATABASE_ID,
    DATABASE_ID: a.DATABASE_ID,
  };
}

export { ID, Query };

// Optional header guard for admin routes
export function requireAdminKey(req) {
  const required = process.env.ADMIN_ROUTE_KEY || "";
  if (!required) return true;
  const key = req.headers.get("x-admin-key") || "";
  if (key !== required) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return true;
}

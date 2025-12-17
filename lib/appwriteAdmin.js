import "server-only";
import { Client, Databases, Storage, Users, ID, Query } from "node-appwrite";

export function getAdmin() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;
  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error("Missing Appwrite admin env vars (ENDPOINT/PROJECT/KEY/DB).");
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
    ID,
    Query,
  };
}

/**
 * Optional header guard for admin routes.
 * Set ADMIN_ROUTE_KEY in Vercel env.
 * Client sends: x-admin-key: <value>
 */
export function requireAdminKey(req) {
  const required = process.env.ADMIN_ROUTE_KEY || "";
  if (!required) return true; // If you didn't set it, don't block.

  const key = req.headers.get("x-admin-key") || "";
  if (key !== required) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return true;
}

// Compatibility (some routes might import getAdminClient)
export function getAdminClient() {
  return getAdmin().client;
}

import "server-only";

import { Client, Databases, Users, Storage, ID } from "node-appwrite";

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;

const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const API_KEY = process.env.APPWRITE_API_KEY;

export const ADMIN_DB_ID =
  process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Hard fail on server if missing (prevents silent runtime issues)
if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  throw new Error(
    "Missing APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID/APPWRITE_API_KEY env vars for admin SDK."
  );
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

export const adminClient = client;
export const adminDb = new Databases(client);
export const adminUsers = new Users(client);
export const adminStorage = new Storage(client);
export { ID };

/**
 * Optional: simple header guard for admin routes.
 * Add `x-admin-key` to requests and set ADMIN_ROUTE_KEY in env.
 */
export function requireAdminKey(req) {
  const required = process.env.ADMIN_ROUTE_KEY || "";
  if (!required) return true; // if not set, don't block
  const key = req.headers.get("x-admin-key") || "";
  if (key !== required) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return true;
}

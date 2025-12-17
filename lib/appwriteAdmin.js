// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Storage, Users } from "node-appwrite";

/**
 * Admin SDK (Server-only)
 * Requires:
 *  - APPWRITE_ENDPOINT
 *  - APPWRITE_PROJECT_ID
 *  - APPWRITE_API_KEY
 *  - APPWRITE_DATABASE_ID
 *
 * Falls back to NEXT_PUBLIC_* only if you intentionally reuse values.
 */
export function getAdmin() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  // Prefer server DB id, fallback to public if you used only that
  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

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
    DB_ID: DATABASE_ID,
    DATABASE_ID,
  };
}

/**
 * Backwards-compat exports so older routes don't break.
 * Some routes may import { getAdminClient } and call it.
 */
export const getAdminClient = getAdmin;

/**
 * Optional extra guard for admin routes (header-based).
 * If ADMIN_ROUTE_KEY is set in Vercel, requests must include x-admin-key header.
 */
export function requireAdminAuth(req) {
  const required = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  if (!required) return true; // if not set, don't block

  const got = String(req?.headers?.get?.("x-admin-key") || "").trim();
  if (got !== required) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return true;
}

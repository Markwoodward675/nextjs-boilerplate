// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Storage, Users } from "node-appwrite";

export const runtime = "nodejs";

export const ADMIN_DB_ID =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

export function getAdminClient() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    "";

  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    "";

  const API_KEY = process.env.APPWRITE_API_KEY || "";

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !ADMIN_DB_ID) {
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
    DATABASE_ID: ADMIN_DB_ID,
  };
}

/**
 * Backwards alias (some older code used getAdmin)
 */
export function getAdmin() {
  return getAdminClient();
}

/**
 * Used by admin API routes to lock them behind a secret header.
 * Header options supported:
 * - x-admin-key: <ADMIN_ROUTE_KEY>
 * - authorization: Bearer <ADMIN_ROUTE_KEY>
 */
export function requireAdminKey(req) {
  const expected = process.env.ADMIN_ROUTE_KEY || "";
  if (!expected) throw new Error("Missing ADMIN_ROUTE_KEY env var.");

  const h = req?.headers;
  const x = h?.get?.("x-admin-key") || "";
  const auth = h?.get?.("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  const got = (x || bearer || "").trim();
  if (!got || got !== expected) throw new Error("Unauthorized.");
  return true;
}

/**
 * Convenience exports some of your admin routes may already import
 */
export function adminDb() {
  return getAdminClient().db;
}

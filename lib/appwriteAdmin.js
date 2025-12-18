// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Storage, Users, ID, Query } from "node-appwrite";

export { ID, Query };

// Your fixed admin email
export const ADMIN_EMAIL = "elonmuskite@gmail.com";

/**
 * Single source of truth for server SDK
 * Uses ONLY server env vars (fallbacks included)
 */
export function getAdminClient() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error(
      "Missing Appwrite admin env vars (APPWRITE_ENDPOINT/APPWRITE_PROJECT_ID/APPWRITE_API_KEY/APPWRITE_DATABASE_ID)."
    );
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    DATABASE_ID,
  };
}

// Back-compat alias (some of your routes used getAdmin())
export function getAdmin() {
  return getAdminClient();
}

/**
 * Protect API routes using the Vercel "ADMIN_ROUTE_KEY" (server-only).
 * Client pages MUST NOT have this key.
 */
export function requireAdminKey(req) {
  const expected = process.env.ADMIN_ROUTE_KEY;
  if (!expected) throw new Error("ADMIN_ROUTE_KEY is not set in Vercel env.");

  const h = req.headers;
  const key =
    h.get("x-admin-key") ||
    (h.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (!key || key !== expected) {
    const e = new Error("Unauthorized (missing/invalid admin key).");
    e.status = 401;
    throw e;
  }
  return true;
}

/**
 * Back-compat name used in your build logs.
 * For now it's the same as requireAdminKey (stable + works everywhere).
 */
export function requireAdminAuth(req) {
  return requireAdminKey(req);
}

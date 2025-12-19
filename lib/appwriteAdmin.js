import "server-only";

import { Client, Databases, Users, Storage, ID, Query } from "node-appwrite";
export { ID, Query };

/**
 * Server-only Admin client (Appwrite API Key).
 *
 * Required:
 * - APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)
 * - APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)
 * - APPWRITE_API_KEY
 *
 * Database ID:
 * - APPWRITE_DATABASE_ID OR NEXT_PUBLIC_APPWRITE_DATABASE_ID OR NEXT_PUBLIC_APPWRITE_DB_ID
 */

const ENDPOINT =
  (process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();

const PROJECT_ID =
  (process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();

const API_KEY = (process.env.APPWRITE_API_KEY || "").trim();

export const DATABASE_ID = (
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  ""
).trim();

let _cached = null;

export function getAdmin() {
  if (_cached) return _cached;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error(
      "Missing admin env vars. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY."
    );
  }
  if (!DATABASE_ID) {
    throw new Error(
      "Missing database id. Set APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID / NEXT_PUBLIC_APPWRITE_DB_ID)."
    );
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  _cached = {
    client,
    db: new Databases(client),
    users: new Users(client),
    storage: new Storage(client),
    DATABASE_ID,
  };

  return _cached;
}

// Alias used across your repo
export function getAdminClient() {
  return getAdmin();
}

// Admin route key guard (header-based)
function _readAdminKeyFromReq(req) {
  const h = req?.headers;
  const raw =
    h?.get?.("x-admin-key") ||
    h?.get?.("x-admin-secret") ||
    h?.get?.("authorization") ||
    "";

  if (String(raw).toLowerCase().startsWith("bearer ")) return String(raw).slice(7).trim();
  return String(raw).trim();
}

export function requireAdminKey(req) {
  const expected = (process.env.ADMIN_ROUTE_KEY || "").trim();
  if (!expected) return { ok: true }; // if empty, no lock

  const got = _readAdminKeyFromReq(req);
  if (!got || got !== expected) {
    return { ok: false, status: 401, error: "Unauthorized (missing/invalid admin key)." };
  }
  return { ok: true };
}

// Name your routes import (your build logs expect this export)
export function requireAdminAuth(req) {
  return requireAdminKey(req);
}

// Helper: find Appwrite user by email
export async function adminFindUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  const { users } = getAdmin();
  const res = await users.list([Query.equal("email", e)], 1, 0);
  return res?.users?.[0] || null;
}

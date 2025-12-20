// lib/appwriteAdmin.js
import "server-only";

import { Client, Databases, Users, Storage, ID, Query } from "node-appwrite";
export { ID, Query };

/**
 * Server-only Appwrite Admin wrapper.
 *
 * Required env:
 * - APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)
 * - APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)
 * - APPWRITE_API_KEY
 *
 * Optional:
 * - APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID / NEXT_PUBLIC_APPWRITE_DB_ID)
 * - ADMIN_ROUTE_KEY (optional admin API key gate)
 */

export const ADMIN_DB_ID =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
  "";

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const API_KEY = process.env.APPWRITE_API_KEY || "";

let _cached = null;

export function getAdminClient() {
  if (_cached) return _cached;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error(
      "Admin client not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY."
    );
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  const db = new Databases(client);
  const users = new Users(client);
  const storage = new Storage(client);

  const DATABASE_ID = ADMIN_DB_ID;
  if (!DATABASE_ID) {
    throw new Error(
      "Admin database not configured. Set APPWRITE_DATABASE_ID (recommended) or NEXT_PUBLIC_APPWRITE_DATABASE_ID."
    );
  }

  _cached = { client, db, users, storage, DATABASE_ID };
  return _cached;
}

export function getAdmin() {
  return getAdminClient();
}

export function adminDb() {
  return getAdminClient().db;
}

// ----- Optional Admin-Key gate (for cron/internal tools, NOT needed for normal UI) -----
function readAdminKeyFromReq(req) {
  const h = req?.headers;
  const raw =
    h?.get?.("x-admin-key") ||
    h?.get?.("x-admin-secret") ||
    h?.get?.("authorization") ||
    "";

  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();
  return raw.trim();
}

export function requireAdminKey(req) {
  const expected = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  if (!expected) return { ok: true }; // gate disabled

  const got = readAdminKeyFromReq(req);
  if (!got || got !== expected) {
    return { ok: false, status: 401, error: "Unauthorized (missing/invalid admin key)." };
  }
  return { ok: true };
}

export function requireAdminAuth(req) {
  return requireAdminKey(req);
}

export async function adminFindUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  const { users } = getAdminClient();
  const res = await users.list([Query.equal("email", e)], 1, 0);
  return res?.users?.[0] || null;
}

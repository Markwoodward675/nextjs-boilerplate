// lib/appwriteAdmin.js
import "server-only";

import { Client, Databases, Users, Storage, Query } from "node-appwrite";

/**
 * Env required (server-only):
 * - APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)
 * - APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)
 * - APPWRITE_API_KEY
 *
 * Optional:
 * - APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID / NEXT_PUBLIC_APPWRITE_DB_ID)
 * - ADMIN_ROUTE_KEY (protects /api/admin/* routes if you use it)
 */

export const ADMIN_DB_ID =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
  "Daytrader_main"; // fallback (change if your real DB id is different)

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

export function getAdmin() {
  if (_cached) return _cached;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error(
      "Admin client not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY."
    );
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const db = new Databases(client);
  const users = new Users(client);
  const storage = new Storage(client);

  _cached = { client, db, users, storage, DATABASE_ID: ADMIN_DB_ID, Query };
  return _cached;
}

// Alias names used across your repo
export function getAdminClient() {
  return getAdmin();
}

// Some routes import adminDb / ADMIN_DB_ID
export function adminDb() {
  return getAdmin().db;
}

// Some routes import requireAdminKey and others requireAdminAuth
function _readAdminKeyFromReq(req) {
  const h = req?.headers;
  const raw =
    h?.get?.("x-admin-key") ||
    h?.get?.("x-admin-secret") ||
    h?.get?.("authorization") ||
    "";

  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();
  return raw.trim();
}

// Returns { ok, status, error } so any route can do:
// const gate = requireAdminAuth(req); if (!gate.ok) return NextResponse.json(...)
export function requireAdminKey(req) {
  const expected = (process.env.ADMIN_ROUTE_KEY || "").trim();

  // If you don't want admin auth at all, set ADMIN_ROUTE_KEY="" and it will pass.
  if (!expected) return { ok: true };

  const got = _readAdminKeyFromReq(req);
  if (!got || got !== expected) {
    return { ok: false, status: 401, error: "Unauthorized (missing/invalid admin key)." };
  }
  return { ok: true };
}

export function requireAdminAuth(req) {
  return requireAdminKey(req);
}

// Helper: find Appwrite user by email (admin)
export async function adminFindUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  const { users, Query } = getAdmin();
  const res = await users.list([Query.equal("email", e)], 1, 0);
  const u = res?.users?.[0] || null;
  return u;
}

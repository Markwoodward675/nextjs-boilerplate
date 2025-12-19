// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Users, Storage, ID, Query } from "node-appwrite";

export { ID, Query };

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

// Prefer server DB var, fallback to NEXT_PUBLIC for convenience
const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

let _cached = null;

export function getAdmin() {
  if (_cached) return _cached;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error(
      "Missing admin env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY."
    );
  }
  if (!DATABASE_ID) {
    throw new Error(
      "Missing DB id. Set APPWRITE_DATABASE_ID (recommended) or NEXT_PUBLIC_APPWRITE_DATABASE_ID."
    );
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  _cached = {
    client,
    db: new Databases(client),
    users: new Users(client),
    storage: new Storage(client),
    DATABASE_ID,
    ID,
    Query,
  };

  return _cached;
}

export function getAdminClient() {
  return getAdmin();
}

// Optional admin API route lock
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

export function requireAdminKey(req) {
  const expected = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  if (!expected) return { ok: true }; // allow if unset

  const got = _readAdminKeyFromReq(req);
  if (!got || got !== expected) {
    return { ok: false, status: 401, error: "Unauthorized (missing/invalid admin key)." };
  }
  return { ok: true };
}

export function requireAdminAuth(req) {
  return requireAdminKey(req);
}

// Node Appwrite Users API: easiest is search by email
export async function adminFindUserByEmail(email) {
  const e = String(email || "").trim();
  if (!e) return null;

  const { users } = getAdmin();
  // node-appwrite supports `search` for users
  const res = await users.list([], e);
  return res?.users?.[0] || null;
}

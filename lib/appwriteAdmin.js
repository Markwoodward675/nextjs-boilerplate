// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Users, Storage, ID, Query } from "node-appwrite";

export { ID, Query };

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT ||
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  "";

const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  "";

const API_KEY = process.env.APPWRITE_API_KEY || "";

export const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  "";

let _cached = null;

export function getAdmin() {
  if (_cached) return _cached;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error(
      "Missing Appwrite admin env vars. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY."
    );
  }
  if (!DATABASE_ID) {
    throw new Error(
      "Missing database id. Set APPWRITE_DATABASE_ID (server) or NEXT_PUBLIC_APPWRITE_DATABASE_ID."
    );
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  const db = new Databases(client);
  const users = new Users(client);
  const storage = new Storage(client);

  _cached = { client, db, users, storage, DATABASE_ID, Query };
  return _cached;
}

// alias used in your routes
export function getAdminClient() {
  return getAdmin();
}

// Admin-route protection (optional)
function _readAdminKey(req) {
  const h = req?.headers;
  const raw =
    h?.get?.("x-admin-key") ||
    h?.get?.("authorization") ||
    "";
  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();
  return raw.trim();
}

export function requireAdminAuth(req) {
  const expected = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  if (!expected) return { ok: true }; // allow if you didn't set a key
  const got = _readAdminKey(req);
  if (!got || got !== expected) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true };
}

// lib/appwriteAdmin.js
import "server-only";
import { Client, Databases, Storage, Users } from "node-appwrite";

function pick(...vals) {
  for (const v of vals) if (v && String(v).trim() !== "") return String(v).trim();
  return "";
}

export function getAdmin() {
  const ENDPOINT = pick(process.env.APPWRITE_ENDPOINT, process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
  const PROJECT_ID = pick(process.env.APPWRITE_PROJECT_ID, process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  const API_KEY = pick(process.env.APPWRITE_API_KEY);
  const DATABASE_ID = pick(process.env.APPWRITE_DATABASE_ID, process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, process.env.NEXT_PUBLIC_APPWRITE_DB_ID);

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error("Missing Appwrite admin env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID");
  }

  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);

  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    DATABASE_ID,
    PROJECT_ID,
    ENDPOINT,
  };
}

// Backwards-compatible aliases (so old imports stop breaking)
export const getAdminClient = getAdmin;
export const getAdminClientStrict = getAdmin;
export const ADMIN_DB_ID = (() => {
  try {
    return getAdmin().DATABASE_ID;
  } catch {
    return "";
  }
})();

export function requireAdminKey(req) {
  const expected = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  if (!expected) throw new Error("Missing ADMIN_ROUTE_KEY env var.");
  const got = String(req?.headers?.get?.("x-admin-key") || "").trim();
  if (!got || got !== expected) throw new Error("Unauthorized: bad admin route key.");
  return true;
}

// JWT-based admin auth (recommended for browser calls)
// Client sends: x-appwrite-jwt: <jwt> (created from account.createJWT())
export async function requireAdminAuth(req) {
  // Option A: server-to-server key
  const expectedKey = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  const gotKey = String(req?.headers?.get?.("x-admin-key") || "").trim();
  if (expectedKey && gotKey && gotKey === expectedKey) return { ok: true, mode: "key" };

  // Option B: Appwrite JWT from the signed-in user
  const jwt =
    String(req?.headers?.get?.("x-appwrite-jwt") || "").trim() ||
    String(req?.headers?.get?.("authorization") || "").replace(/^Bearer\s+/i, "").trim();

  if (!jwt) throw new Error("Unauthorized: missing admin JWT.");

  const { ENDPOINT, PROJECT_ID } = getAdmin(); // uses envs (no key required for /account lookup)
  const adminEmail = String(process.env.ADMIN_EMAIL || "elonmuskite@gmail.com").toLowerCase();

  const r = await fetch(`${ENDPOINT}/account`, {
    headers: {
      "X-Appwrite-Project": PROJECT_ID,
      "X-Appwrite-JWT": jwt,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!r.ok) throw new Error("Unauthorized: invalid JWT.");
  const u = await r.json().catch(() => ({}));
  const email = String(u?.email || "").toLowerCase();

  if (!email || email !== adminEmail) throw new Error("Unauthorized: not an admin user.");

  return { ok: true, mode: "jwt", user: u };
}

// Optional helper some routes may import
export function adminDb() {
  return getAdmin().db;
}

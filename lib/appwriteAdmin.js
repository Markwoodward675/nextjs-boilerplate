import "server-only";
export const runtime = "nodejs";

import { Client, Databases, Storage, Users, ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";

/** ---------------------------
 * Admin SDK helper
 * -------------------------- */
export function getAdmin() {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;

  const DATABASE_ID =
    process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
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
    DATABASE_ID,
  };
}

// Back-compat aliases (your routes import this name)
export const getAdminClient = getAdmin;

/** ---------------------------
 * Admin route protection
 * Routes should send: x-admin-key: <ADMIN_ROUTE_KEY>
 * -------------------------- */
export function requireAdminAuth(req) {
  const expected = String(process.env.ADMIN_ROUTE_KEY || "").trim();
  const got = String(req?.headers?.get("x-admin-key") || "").trim();

  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "ADMIN_ROUTE_KEY is not set in Vercel env." },
        { status: 500 }
      ),
    };
  }

  if (!got || got !== expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized (missing/invalid admin key)." },
        { status: 401 }
      ),
    };
  }

  return { ok: true };
}

// ✅ IMPORTANT: your /api/bootstrap route imports these from appwriteAdmin
export { ID, Query };

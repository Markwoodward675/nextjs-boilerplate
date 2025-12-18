import "server-only";

import { Client, Databases, Storage, Users, ID, Query } from "node-appwrite";
import { NextResponse } from "next/server";

function pick(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export { ID, Query };

export function getAdminClient() {
  const ENDPOINT = pick(process.env.APPWRITE_ENDPOINT, process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
  const PROJECT_ID = pick(process.env.APPWRITE_PROJECT_ID, process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
  const API_KEY = pick(process.env.APPWRITE_API_KEY);

  const DATABASE_ID = pick(
    process.env.APPWRITE_DATABASE_ID,
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID
  );

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error("Missing Appwrite admin env vars (ENDPOINT/PROJECT/KEY/DB).");
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

// Back-compat exports (so existing routes don’t break)
export const getAdmin = getAdminClient;

export function requireAdminAuth(req) {
  const expected = pick(process.env.ADMIN_ROUTE_KEY);
  if (!expected) {
    return { ok: false, res: NextResponse.json({ ok: false, error: "ADMIN_ROUTE_KEY is not set." }, { status: 500 }) };
  }

  const h = req?.headers;
  const key =
    h?.get("x-admin-route-key") ||
    h?.get("x-admin-key") ||
    (h?.get("authorization") || "").replace(/^Bearer\s+/i, "");

  if (key !== expected) {
    return { ok: false, res: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }

  return { ok: true };
}

// more back-compat aliases some of your routes may import
export const requireAdminKey = requireAdminAuth;

import "server-only";
import { Client, Databases, Storage, Users } from "node-appwrite";

/**
 * Server-only Appwrite Admin SDK helper.
 * Fixes build warnings by exporting BOTH `getAdmin()` and `getAdminClient()`.
 * Uses a cached singleton so routes don’t recreate the client on every call.
 */

let _cached = null;

function mustEnv(name, val) {
  if (!val) throw new Error(`Missing env var: ${name}`);
  return val;
}

export function getAdmin() {
  if (_cached) return _cached;

  const ENDPOINT = mustEnv(
    "APPWRITE_ENDPOINT (or NEXT_PUBLIC_APPWRITE_ENDPOINT)",
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  );

  const PROJECT_ID = mustEnv(
    "APPWRITE_PROJECT_ID (or NEXT_PUBLIC_APPWRITE_PROJECT_ID)",
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  );

  const API_KEY = mustEnv("APPWRITE_API_KEY", process.env.APPWRITE_API_KEY);

  const DATABASE_ID = mustEnv(
    "APPWRITE_DATABASE_ID (or NEXT_PUBLIC_APPWRITE_DATABASE_ID)",
    process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID
  );

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  _cached = {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    DATABASE_ID,
  };

  return _cached;
}

/**
 * Backwards-compat export:
 * Some routes already import `getAdminClient` — keep it to prevent future breakage.
 */
export function getAdminClient() {
  return getAdmin();
}

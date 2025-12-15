import "server-only";
import { Client, Users, Databases } from "node-appwrite";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY; // IMPORTANT: server secret key
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  throw new Error("Missing APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY env vars.");
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

export const adminUsers = new Users(client);
export const adminDb = new Databases(client);
export const ADMIN_DB_ID = DATABASE_ID;

  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    ID,
  };
}

export function requireAdminKey(req) {
  const key = req.headers.get("x-admin-key") || "";
  if (!process.env.ADMIN_PANEL_KEY) throw new Error("ADMIN_PANEL_KEY not configured");
  if (key !== process.env.ADMIN_PANEL_KEY) {
    const e = new Error("Unauthorized admin");
    e.status = 401;
    throw e;
  }
}

// lib/appwriteAdmin.js
import "server-only";
import { cookies, headers } from "next/headers";
import { Client, Databases, Storage, Users } from "node-appwrite";

/**
 * Low-level admin client
 */
export function getAdminClient() {
  const ENDPOINT = process.env.APPWRITE_ENDPOINT;
  const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
  const API_KEY = process.env.APPWRITE_API_KEY;
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID) {
    throw new Error("Missing Appwrite admin env vars.");
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
    DB_ID: DATABASE_ID,
  };
}

/**
 * 🔐 HARD ADMIN AUTH GUARD (used by ALL /api/admin/* routes)
 */
export async function requireAdminAuth() {
  const adminEmail = "elonmuskite@gmail.com";

  // Read cookie set by /api/admin/session
  const cookieStore = cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  if (!adminSession) {
    throw new Error("Unauthorized (no admin session)");
  }

  const { users } = getAdminClient();

  // Validate session against Appwrite
  const user = await users.get(adminSession);

  if (!user || user.email !== adminEmail) {
    throw new Error("Forbidden (not admin)");
  }

  return user;
}

// lib/appwriteAdmin.js
import { Client, Users, Databases, ID, Query } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

// Optional: a shared admin secret used by your admin UI/API calls
const adminRouteKey = process.env.ADMIN_ROUTE_KEY;

if (!endpoint || !projectId || !apiKey) {
  throw new Error(
    "Missing Appwrite admin env vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY"
  );
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

export const adminUsers = new Users(client);
export const adminDb = new Databases(client);

// Re-export helpers used by your route files:
export { ID, Query };

// Minimal admin guard used by many /api/admin/* routes
export async function requireAdminAuth(req) {
  // If you’re using a header key:
  const key =
    req.headers.get("x-admin-key") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!adminRouteKey || !key || key !== adminRouteKey) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}

export default client;

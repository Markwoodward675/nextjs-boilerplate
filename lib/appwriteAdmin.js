import "server-only";
import { Client, Databases, Storage, Users, ID, Query } from "node-appwrite";

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
    ID,
    Query,
  };
}

// ---- Admin Auth (JWT + allowlist + httpOnly cookie) ----

function parseCSV(envValue) {
  return String(envValue || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getUserFromAppwriteJWT(jwt) {
  const ENDPOINT =
    process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  if (!ENDPOINT || !PROJECT_ID) throw new Error("Missing Appwrite endpoint/project.");

  const res = await fetch(`${ENDPOINT}/account`, {
    method: "GET",
    headers: {
      "X-Appwrite-Project": PROJECT_ID,
      "X-Appwrite-JWT": jwt,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Invalid admin session (JWT).");
  }
  return data; // Appwrite user object
}

export async function requireAdminAuth(req) {
  // 1) Must have httpOnly cookie set by /api/admin/session
  const cookie = req.cookies?.get?.("dt_admin")?.value;
  if (!cookie) {
    const err = new Error("Admin session missing.");
    err.status = 401;
    throw err;
  }

  // 2) Must supply a fresh JWT (sent by admin UI)
  const jwt = req.headers.get("x-admin-jwt") || "";
  if (!jwt) {
    const err = new Error("Missing admin JWT.");
    err.status = 401;
    throw err;
  }

  // 3) JWT must resolve to an allowed user
  const user = await getUserFromAppwriteJWT(jwt);

  const allowedEmails = parseCSV(process.env.ADMIN_ALLOWED_EMAILS);
  const allowedUserIds = parseCSV(process.env.ADMIN_ALLOWED_USER_IDS);

  const emailOk =
    allowedEmails.length === 0
      ? false
      : allowedEmails.includes(String(user?.email || "").toLowerCase());

  const idOk =
    allowedUserIds.length === 0 ? false : allowedUserIds.includes(String(user?.$id || ""));

  if (!emailOk && !idOk) {
    const err = new Error("Not authorized as admin.");
    err.status = 403;
    throw err;
  }

  return { user };
}

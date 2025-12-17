// lib/appwriteAdmin.js
import {
  Client,
  Account,
  Users,
  Databases,
  Teams,
  ID,
  Query,
} from "node-appwrite";

/**
 * IMPORTANT:
 * - Never throw during import (Next build-safe).
 * - Only throw inside functions that are called at runtime.
 */

function mustEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

function createAdminClient() {
  const endpoint = mustEnv("APPWRITE_ENDPOINT");
  const projectId = mustEnv("APPWRITE_PROJECT_ID");
  const apiKey = mustEnv("APPWRITE_API_KEY");

  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
}

function createUserClientFromJwt(jwt) {
  const endpoint = mustEnv("APPWRITE_ENDPOINT");
  const projectId = mustEnv("APPWRITE_PROJECT_ID");

  // JWT is created by the logged-in user via Account.createJWT() on the client.
  // Server uses it to verify who is calling.
  return new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
}

function getBearerToken(req) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function normalizeRolesFromPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return [];
  const role = typeof prefs.role === "string" ? [prefs.role] : [];
  const roles = Array.isArray(prefs.roles) ? prefs.roles : [];
  return [...new Set([...role, ...roles].map((r) => String(r).toLowerCase()))];
}

/**
 * OPTIONAL: Team-based admin control (more robust than prefs, if you want)
 * Set:
 * - APPWRITE_ADMIN_TEAM_ID (required to enable team check)
 * - APPWRITE_ADMIN_TEAM_ROLE (optional, default "admin")
 */
async function isAdminByTeam(adminClient, userId) {
  const teamId = process.env.APPWRITE_ADMIN_TEAM_ID;
  if (!teamId) return false;

  const requiredRole = (process.env.APPWRITE_ADMIN_TEAM_ROLE || "admin")
    .toLowerCase()
    .trim();

  const teams = new Teams(adminClient);

  // We try to filter memberships by userId and then check roles.
  // (Method signatures vary by SDK version; this is the most common pattern.)
  const res = await teams.listMemberships(teamId, [
    Query.equal("userId", userId),
  ]);

  const memberships = res?.memberships || [];
  return memberships.some((m) => {
    const roles = (m?.roles || []).map((r) => String(r).toLowerCase());
    return roles.includes(requiredRole);
  });
}

/**
 * Reads the calling user from JWT (Authorization: Bearer <jwt>)
 */
export async function getCallerFromRequest(req) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    return {
      ok: false,
      status: 401,
      error: "Missing Authorization Bearer token (Appwrite JWT).",
    };
  }

  try {
    const userClient = createUserClientFromJwt(jwt);
    const account = new Account(userClient);
    const user = await account.get(); // who is calling
    return { ok: true, user, jwt };
  } catch (e) {
    return { ok: false, status: 401, error: "Invalid/expired JWT." };
  }
}

/**
 * Normalized Admin guard:
 * - Verify caller by JWT
 * - Check admin role (prefs.role / prefs.roles OR team membership)
 */
export async function requireAdmin(req, { role = "admin" } = {}) {
  const caller = await getCallerFromRequest(req);
  if (!caller.ok) return caller;

  const user = caller.user;

  // 1) Role via user prefs (simple + fast)
  const roles = normalizeRolesFromPrefs(user?.prefs);
  const required = String(role).toLowerCase();

  if (roles.includes(required)) {
    return { ok: true, user };
  }

  // 2) Optional: Team-based check (if configured)
  try {
    const adminClient = createAdminClient();
    const teamOk = await isAdminByTeam(adminClient, user.$id);
    if (teamOk) return { ok: true, user };
  } catch (e) {
    // If env/team not set, ignore and fall through to unauthorized
  }

  return { ok: false, status: 403, error: "Forbidden (admin role required)." };
}

/**
 * Standard admin accessors (normalized)
 * Use these INSIDE routes after requireAdmin() succeeds.
 */
export function getAdmin() {
  const client = createAdminClient();
  return {
    client,
    db: new Databases(client),
    users: new Users(client),
    teams: new Teams(client),
  };
}

export function getAdminClient() {
  return createAdminClient();
}

/**
 * Backward-compat exports (if some routes still import these names)
 * - prefer requireAdmin(req) moving forward
 */
export async function requireAdminAuth(req) {
  // Kept for compatibility: same behavior as requireAdmin()
  return requireAdmin(req);
}

/**
 * Helpers used across many routes
 */
export { ID, Query };
/*

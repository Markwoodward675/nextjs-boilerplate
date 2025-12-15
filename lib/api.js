"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

/* =========================
   ENV + CLIENT
   ========================= */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

function must(name, val) {
  if (!val || String(val).trim() === "") {
    throw new Error(`${name} is not configured.`);
  }
}

must("NEXT_PUBLIC_APPWRITE_ENDPOINT", ENDPOINT);
must("NEXT_PUBLIC_APPWRITE_PROJECT_ID", PROJECT_ID);
must("NEXT_PUBLIC_APPWRITE_DATABASE_ID", DATABASE_ID);

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const DB_ID = DATABASE_ID;

/* =========================
   ERROR (NO external import)
   ========================= */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* =========================
   SDK-COMPAT SESSIONS
   ========================= */
async function createPasswordSession(email, password) {
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  if (typeof account.createSession === "function") {
    return account.createSession(email, password);
  }
  throw new Error("Your Appwrite SDK does not support email/password sessions.");
}

/* =========================
   NORMALIZERS (accept both)
   ========================= */
function normSignIn(a, b) {
  const p = typeof a === "object" && a ? a : { email: a, password: b };
  return {
    email: String(p.email || "").trim(),
    password: String(p.password || ""),
  };
}

function normSignUp(a, b, c) {
  const p = typeof a === "object" && a ? a : { fullName: a, email: b, password: c };
  return {
    fullName: String(p.fullName || "").trim(),
    email: String(p.email || "").trim(),
    password: String(p.password || ""),
    ...p,
  };
}

/* =========================
   AUTH
   ========================= */
export async function signUp(a, b, c) {
  try {
    const { fullName, email, password } = normSignUp(a, b, c);

    if (!fullName) throw new Error("Full name is required.");
    if (!email) throw new Error("Email is required.");
    if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

    const user = await account.create(ID.unique(), email, password, fullName);
    await createPasswordSession(email, password);

    return user;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to create account."));
  }
}

export async function signIn(a, b) {
  try {
    const { email, password } = normSignIn(a, b);

    if (!email) throw new Error("Email is required.");
    if (!password) throw new Error("Password is required.");

    return await createPasswordSession(email, password);
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to sign in."));
  }
}

export async function signOut() {
  try {
    if (typeof account.deleteSession === "function") return account.deleteSession("current");
    if (typeof account.deleteSessions === "function") return account.deleteSessions();
  } catch {
    // ignore
  }
}

/* =========================
   YOUR PROJECT HELPERS
   (safe stubs + expected exports)
   ========================= */

/**
 * IMPORTANT:
 * These functions MUST exist because your pages import them:
 * - ensureUserBootstrap
 * - getUserAlerts
 * - createOrRefreshVerifyCode
 *
 * Adjust COLLECTION IDs below to match your Appwrite database.
 */

const COL_PROFILES = "profiles";
const COL_ALERTS = "alerts";
const COL_VERIFY_CODES = "verify_codes";

// Create profile if missing; return bootstrap object
export async function ensureUserBootstrap() {
  try {
    const user = await account.get();

    // Ensure profile doc exists
    let profile = null;
    try {
      profile = await db.getDocument(DB_ID, COL_PROFILES, user.$id);
    } catch {
      profile = await db.createDocument(DB_ID, COL_PROFILES, user.$id, {
        userId: user.$id,
        email: user.email,
        fullName: user.name || "",
        verificationCodeVerified: false,
        createdAt: new Date().toISOString(),
      });
    }

    return { user, profile };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to bootstrap user."));
  }
}

export async function getUserAlerts(userId) {
  try {
    const res = await db.listDocuments(DB_ID, COL_ALERTS, [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);
    return res.documents || [];
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to load notifications."));
  }
}

export async function createOrRefreshVerifyCode(userId) {
  try {
    // generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // store it (one active per user)
    // Strategy: create document with userId as docId, overwrite with update if exists
    try {
      await db.getDocument(DB_ID, COL_VERIFY_CODES, userId);
      await db.updateDocument(DB_ID, COL_VERIFY_CODES, userId, {
        userId,
        code,
        createdAt: new Date().toISOString(),
        used: false,
      });
    } catch {
      await db.createDocument(DB_ID, COL_VERIFY_CODES, userId, {
        userId,
        code,
        createdAt: new Date().toISOString(),
        used: false,
      });
    }

    // also push an alert
    await db.createDocument(DB_ID, COL_ALERTS, ID.unique(), {
      userId,
      title: "Your access code",
      body: `Your 6-digit access code is: ${code}`,
      createdAt: new Date().toISOString(),
    });

    return { code };
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to generate verification code."));
  }
}

/* =========================
   COMPAT ALIASES (prevents
   “is not a function”)
   ========================= */
export const registerUser = async (...args) => signUp(...args);
export const loginUser = async (...args) => signIn(...args);

export { ID, Query };

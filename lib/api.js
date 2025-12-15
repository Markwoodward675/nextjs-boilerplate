"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

/* =========================
   ENV
   ========================= */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Optional: allow overriding collection IDs via env
const COL_PROFILES = process.env.NEXT_PUBLIC_COL_PROFILES || "profiles";
const COL_ALERTS = process.env.NEXT_PUBLIC_COL_ALERTS || "alerts";
const COL_VERIFY_CODES = process.env.NEXT_PUBLIC_COL_VERIFY_CODES || "verify_codes";

function must(name, value) {
  if (!value || String(value).trim() === "") {
    throw new Error(`${name} is not configured.`);
  }
}

must("NEXT_PUBLIC_APPWRITE_ENDPOINT", ENDPOINT);
must("NEXT_PUBLIC_APPWRITE_PROJECT_ID", PROJECT_ID);
must("NEXT_PUBLIC_APPWRITE_DATABASE_ID", DATABASE_ID);

/* =========================
   CLIENT
   ========================= */
const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

export const account = new Account(client);
export const db = new Databases(client);
export const DB_ID = DATABASE_ID;

/* =========================
   ERROR HELPERS
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
  // Newer SDK
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  // Older SDK
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  // Very old/rare fallback
  if (typeof account.createSession === "function") {
    return account.createSession(email, password);
  }
  throw new Error(
    "Your Appwrite SDK does not support email/password sessions. Check your 'appwrite' package version."
  );
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
    ...p, // keep any extra fields like referralId
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
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

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
  // used by /signout page + nav
  try {
    if (typeof account.deleteSession === "function") {
      await account.deleteSession("current");
      return;
    }
    if (typeof account.deleteSessions === "function") {
      await account.deleteSessions();
      return;
    }
  } catch {
    // ignore sign-out errors; we still redirect client-side
  }
}

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

/* =========================
   PROJECT HELPERS (used in pages)
   ========================= */

// Ensures user exists + profile doc exists
export async function ensureUserBootstrap() {
  try {
    const user = await account.get();

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
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Upsert verify code doc using userId as document id
    try {
      await db.getDocument(DB_ID, COL_VERIFY_CODES, userId);
      await db.updateDocument(DB_ID, COL_VERIFY_CODES, userId, {
        userId,
        code,
        used: false,
        createdAt: new Date().toISOString(),
      });
    } catch {
      await db.createDocument(DB_ID, COL_VERIFY_CODES, userId, {
        userId,
        code,
        used: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Push an alert
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
   COMPAT ALIASES
   (prevents “is not a function”)
   ========================= */
export const registerUser = async (...args) => signUp(...args);
export const loginUser = async (...args) => signIn(...args);

/* =========================
   Re-exports
   ========================= */
export { ID, Query };

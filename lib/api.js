"use client";

import { Client, Account, Databases, ID, Query } from "appwrite";

/**
 * ============
 * ENV + CLIENT
 * ============
 */
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

function requireEnv(name, value) {
  if (!value || String(value).trim() === "") {
    throw new Error(
      `${name} is not configured. Please set ${name} in your environment variables.`
    );
  }
}

function getClient() {
  requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT", ENDPOINT);
  requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", PROJECT_ID);

  const client = new Client();
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  return client;
}

const client = getClient();
export const account = new Account(client);
export const db = new Databases(client);

// Export these too (helps other files reuse them)
export const DB_ID = DATABASE_ID || "";

/**
 * =========================
 * INTERNAL HELPERS (SAFE)
 * =========================
 */
function normalizeEmailPassword(a, b) {
  // supports:
  // signIn(email, password)
  // signIn({ email, password })
  const payload =
    typeof a === "object" && a
      ? { email: a.email, password: a.password }
      : { email: a, password: b };

  return {
    email: String(payload.email || "").trim(),
    password: String(payload.password || ""),
  };
}

function normalizeSignUp(a, b, c) {
  // supports:
  // signUp({ fullName, email, password, ... })
  // signUp(fullName, email, password)
  const payload =
    typeof a === "object" && a
      ? a
      : { fullName: a, email: b, password: c };

  return {
    fullName: String(payload.fullName || "").trim(),
    email: String(payload.email || "").trim(),
    password: String(payload.password || ""),
    // keep extra fields if you need them later
    ...payload,
  };
}

function friendlyError(e, fallback = "Something went wrong.") {
  const msg =
    e?.message ||
    e?.response?.message ||
    e?.response ||
    fallback;

  // clean up common noisy Appwrite errors
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

async function createPasswordSession(email, password) {
  // Appwrite SDK differences:
  // - createEmailPasswordSession (newer)
  // - createEmailSession (older)
  // - createSession (very old/rare usage)
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(email, password);
  }
  if (typeof account.createSession === "function") {
    return account.createSession(email, password);
  }
  throw new Error(
    "Your Appwrite SDK does not support email/password sessions. Check your appwrite package version."
  );
}

async function sendVerificationLink(redirectPath = "/verify") {
  // This sends a verification *link* (not a 6-digit code).
  // Your /verify-code page can still be used for your own OTP flow if you built it.
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  if (!origin) return;

  const url = `${origin}${redirectPath}`;
  if (typeof account.createVerification === "function") {
    return account.createVerification(url);
  }

  // Fallback: if SDK doesn't have createVerification
  // (Older SDKs sometimes differ; if you hit this, tell me your appwrite version.)
  throw new Error("Email verification is not supported by your current Appwrite SDK.");
}

/**
 * =========================
 * PUBLIC API (EXPORTS)
 * =========================
 */

// Current user (or null)
export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

// Sign up (bulletproof)
export async function signUp(a, b, c) {
  try {
    const { fullName, email, password } = normalizeSignUp(a, b, c);

    if (!fullName) throw new Error("Full name is required.");
    if (!email) throw new Error("Email is required.");
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    const user = await account.create(ID.unique(), email, password, fullName);

    // Create session immediately (so you can land on verify-code page)
    await createPasswordSession(email, password);

    // Send verification link (optional but recommended)
    // If you ONLY want OTP code flow, you can remove this line.
    try {
      await sendVerificationLink("/verify");
    } catch {
      // ignore verification send failures so signup still works
    }

    return user;
  } catch (e) {
    throw new Error(friendlyError(e, "Unable to create account."));
  }
}

// Sign in (bulletproof)
export async function signIn(a, b) {
  try {
    const { email, password } = normalizeEmailPassword(a, b);

    if (!email) throw new Error("Email is required.");
    if (!password) throw new Error("Password is required.");

    return await createPasswordSession(email, password);
  } catch (e) {
    throw new Error(friendlyError(e, "Unable to sign in."));
  }
}

export async function signOut() {
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
    // ignore
  }
}

// Optional helpers you may use elsewhere
export async function isEmailVerified() {
  const me = await getCurrentUser();
  return !!me?.emailVerification;
}

export async function resendVerification() {
  try {
    await sendVerificationLink("/verify");
    return true;
  } catch (e) {
    throw new Error(friendlyError(e, "Unable to resend verification email."));
  }
}

/**
 * =========================
 * COMPATIBILITY ALIASES
 * (prevents “is not a function”)
 * =========================
 */
export async function registerUser(payload) {
  return signUp(payload);
}

export async function loginUser(payloadOrEmail, maybePassword) {
  return signIn(payloadOrEmail, maybePassword);
}

// Convenience re-exports
export { ID, Query };

"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

if (!ENDPOINT || !PROJECT_ID) {
  // Don't hard-crash builds, but make it obvious in dev.
  if (typeof window !== "undefined") {
    console.warn("[Appwrite] Missing endpoint/project env vars.");
  }
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* ---------------- AUTH ---------------- */

export async function signIn(emailOrObj, passwordMaybe) {
  const email =
    typeof emailOrObj === "string" ? emailOrObj : emailOrObj?.email;
  const password =
    typeof emailOrObj === "string" ? passwordMaybe : emailOrObj?.password;

  if (!email || !password) throw new Error("Email and password are required.");
  // Appwrite v13 uses createEmailSession (NOT createEmailPasswordSession)
  return account.createEmailSession(String(email).trim(), String(password));
}

export async function signUp(a, b, c) {
  // Supports:
  // signUp(email, password, fullName)
  // signUp({ email, password, fullName })
  let email, password, fullName;

  if (typeof a === "object" && a) {
    email = a.email;
    password = a.password;
    fullName = a.fullName || a.name || "";
  } else {
    email = a;
    password = b;
    fullName = c || "";
  }

  email = String(email || "").trim();
  password = String(password || "");

  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  await account.create(ID.unique(), email, password, String(fullName || "").trim());
  // Optional: auto-login after signup
  await account.createEmailSession(email, password);

  return true;
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {}
  return true;
}

// compatibility names (some pages/components may import old names)
export async function logoutUser() {
  return signOut();
}

/* ---------------- BOOTSTRAP (profiles) ---------------- */

export async function ensureUserBootstrap() {
  const user = await account.get();

  const pRes = await databases.listDocuments(DB_ID, "profiles", [
    Query.equal("userId", user.$id),
    Query.limit(1),
  ]);

  const profile = pRes?.documents?.[0] || null;

  return { user, profile };
}

/* ---------------- PASSWORD RECOVERY ---------------- */

// Friendly names for your forgot-password page imports
export async function requestPasswordRecovery(email) {
  return sendPasswordRecovery(email);
}
export async function completePasswordRecovery(userId, secret, password) {
  return resetPasswordWithRecovery(userId, secret, password);
}

export async function sendPasswordRecovery(email) {
  const e = String(email || "").trim();
  if (!e) throw new Error("Email is required.");

  // ---------------- VERIFY CODE (EMAIL via API routes) ----------------

export async function createOrRefreshVerifyCode(userId) {
  if (!userId) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  if (!userId) throw new Error("Missing userId.");
  const c = String(code || "").trim();
  if (!/^\d{6}$/.test(c)) throw new Error("Enter a valid 6-digit code.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}


// Backward-compatible alias (so older imports never break)
export const createOrRefreshVerifyCodeAlias = createOrRefreshVerifyCode;

  // IMPORTANT: Appwrite requires a redirect URL
  const redirect = `${window.location.origin}/reset-password`;
  return account.createRecovery(e, redirect);
}

export async function resetPasswordWithRecovery(userId, secret, password) {
  const p = String(password || "");
  if (!userId || !secret) throw new Error("Invalid recovery link.");
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");
  return account.updateRecovery(userId, secret, p, p);
}

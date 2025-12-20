"use client";

import { account, db, ID, Query, DB_ID, COL, errMsg } from "./appwriteClient";
import { createEmailSessionCompat } from "./appwrite";
import { errMsg } from "./appwriteClient";

/** Unified error message */
export function getErrorMessage(e, fallback = "Something went wrong.") {
  return errMsg(e, fallback);
}

/** Check DB configured */
export function isDbConfigured() {
  return Boolean(DB_ID && DB_ID.trim());
}

/** Always bootstrap from server (best place to ensure profile/wallets) */
export async function ensureUserBootstrap() {
  const r = await fetch("/api/bootstrap", { method: "GET", cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Bootstrap failed.");
  return data; // { ok, user, profile }
}

/** Sign out everywhere */
export async function signOut() {
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }
  return true;
}

/** Sign in (hard-fix: clears existing sessions first, then creates new) */
export async function signIn(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error("Email is required.");
  if (!p) throw new Error("Password is required.");

  await createEmailSessionCompat(e, p);
  return true;
}

/**
 * Sign up:
 * - correct Account.create signature
 * - then sign in
 * - then bootstrap
 */
export async function signUp({ fullName, email, password }) {
  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Full name is required.");
  if (!e) throw new Error("Email is required.");
  if (!p) throw new Error("Password is required.");
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  // Create Appwrite user
  try {
    await account.create(ID.unique(), e, p, name);
  } catch (e2) {
    // If already exists, rethrow to let UI route to verify/signin logic
    throw e2;
  }

  // Auto-signin after signup
  await signIn(e, p);
  await ensureUserBootstrap();
  return true;
}

/** Send / refresh code */
export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const r = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Unable to send code.");
  return true;
}

/** Verify 6-digit code */
export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();

  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const r = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id, code: c }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Verification failed.");

  // Re-bootstrap so UI stops redirect-looping
  await ensureUserBootstrap();
  return true;
}

/** Password recovery */
export async function requestPasswordRecovery(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email is required.");

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL.");

  const url = `${base.replace(/\/$/, "")}/reset-password`;

  // Appwrite requires valid url
  return await account.createRecovery(e, url);
}

export async function completePasswordRecovery(userId, secret, password) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pw = String(password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.");

  // updateRecovery(userId, secret, password, passwordAgain)
  return await account.updateRecovery(uid, sec, pw, pw);
}

/**
 * Optional helper used by some signup flows:
 * We cannot truly “check verified” by email without admin privileges,
 * so this returns "unknown" safely.
 */
export async function getAccountStatusByEmail() {
  return { verified: null };
}
export async function requestPasswordRecovery(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Email is required.");

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL.");

  // validate url
  let redirect;
  try {
    const u = new URL(base);
    redirect = `${u.origin}/reset-password`;
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be a valid URL (e.g. https://day-trader-insights.com).");
  }

  return await account.createRecovery(e, redirect);
}

/** ✅ HARD-FIX: export the name your page is importing */
export async function sendRecoveryEmail(email) {
  return await requestPasswordRecovery(email);
}

/** ✅ reset-password uses this */
export async function completePasswordRecovery(userId, secret, password) {
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pw = String(password || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.");

  return await account.updateRecovery(uid, sec, pw, pw);
}

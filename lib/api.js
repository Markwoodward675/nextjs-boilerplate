// lib/api.js
"use client";

import {
  requireClient,
  requireSession,
  errMsg as _errMsg,
  ID,
} from "./appwriteClient";

import {
  createEmailSessionCompat,
  requestPasswordRecoveryCompat,
  completePasswordRecoveryCompat,
} from "./appwrite";

// ---- Exported error helper (your UI uses getErrorMessage) ----
export function getErrorMessage(e, fallback) {
  return _errMsg(e, fallback);
}

// Alias exports some parts of your code may import
export const ERRmSG = getErrorMessage;

// ---- JSON helper ----
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(String(msg));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---- Session + Bootstrap (single source: user_profile) ----
export async function ensureUserBootstrap() {
  // Always prefer server bootstrap (it can create profile using Admin key)
  try {
    const data = await fetchJson("/api/bootstrap", { method: "GET" });
    return {
      ok: Boolean(data?.ok),
      user: data?.user || data?.me || null,
      profile: data?.profile || null,
      userId: data?.userId || data?.user?.$id || null,
    };
  } catch (e) {
    // fallback: client session only
    const { account } = requireClient();
    const me = await account.get().catch(() => null);
    return { ok: false, user: me, profile: null, userId: me?.$id || null, error: getErrorMessage(e) };
  }
}

// ---- Auth ----
export async function signOut() {
  const { account } = requireClient();
  try {
    await account.deleteSessions();
  } catch {
    try {
      await account.deleteSession("current");
    } catch {
      // ignore
    }
  }
  return true;
}

/**
 * HARD FIX:
 * - ALWAYS allows creating a session by deleting existing sessions first.
 */
export async function signIn(email, password) {
  await createEmailSessionCompat(email, password);
  return ensureUserBootstrap();
}

export async function signUp({ fullName, email, password, referralId = "" }) {
  const { account } = requireClient();

  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Full name is required.");
  if (!e) throw new Error("Email is required.");
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  try {
    // Correct Appwrite order: (userId, email, password, name)
    const u = await account.create(ID.unique(), e, p, name);

    // Create session immediately so cookies are present
    await createEmailSessionCompat(e, p);

    // Bootstrap profile/wallets server-side
    const boot = await ensureUserBootstrap();

    // Optional: you can store referralId later in user_profile inside /api/bootstrap or another route
    return { ok: true, user: u, boot, referralId };
  } catch (e2) {
    // Bubble Appwrite conflict for caller handling
    throw e2;
  }
}

// ---- Verify Code Flow ----
export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");
  return fetchJson("/api/auth/send-verify-code", {
    method: "POST",
    body: JSON.stringify({ userId: uid }),
  });
}

export async function verifySixDigitCode(userId, code) {
  const uid = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!uid) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  return fetchJson("/api/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ userId: uid, code: c }),
  });
}

// ---- Password Recovery (exports required by your pages) ----
export async function requestPasswordRecovery(email) {
  return requestPasswordRecoveryCompat(email);
}

export async function completePasswordRecovery(userId, secret, password, passwordAgain) {
  return completePasswordRecoveryCompat(userId, secret, password, passwordAgain);
}

// ---- Optional status-by-email (if your UI calls it) ----
export async function getAccountStatusByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  try {
    return await fetchJson("/api/auth/account-status", {
      method: "POST",
      body: JSON.stringify({ email: e }),
    });
  } catch {
    return null;
  }
}

// ---- Also re-export requireSession for callers that import it from lib/api ----
export { requireSession };

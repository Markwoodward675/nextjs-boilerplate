"use client";

/**
 * Safe error message extraction
 */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  if (!err) return fallback;
  const msg =
    err?.message ||
    err?.data?.error ||
    err?.data?.message ||
    err?.response?.message ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/**
 * Fetch wrapper for our own Next.js API routes
 * (prevents Appwrite CORS issues in the browser)
 */
async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const e = new Error(data?.error || data?.message || `Request failed (${res.status})`);
    e.status = res.status;
    e.data = data;
    throw e;
  }

  return data;
}

/* =========================
   AUTH
   ========================= */

export async function signIn(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error("Missing password.");

  return apiFetch("/api/auth/signin", {
    method: "POST",
    body: { email: e, password: p },
  });
}

/**
 * Sign up server-side (creates user + creates session cookie)
 * If user already exists, the API route should return:
 *  - status 409
 *  - { ok:false, error:"USER_EXISTS", verified: true/false }
 */
export async function signUp({ fullName, email, password, referralId } = {}) {
  const name = String(fullName || "").trim();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!name) throw new Error("Missing fullName.");
  if (!e) throw new Error("Missing email.");
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  return apiFetch("/api/auth/signup", {
    method: "POST",
    body: {
      fullName: name,
      email: e,
      password: p,
      referralId: String(referralId || "").trim(),
    },
  });
}

export async function signOut() {
  // Best-effort: clears cookies server-side
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
}

// some pages may import logoutUser
export const logoutUser = signOut;

export async function getCurrentUser() {
  const r = await apiFetch("/api/auth/me");
  return r?.user || null;
}

/**
 * Returns { user, profile }
 * (server reads Appwrite session cookie; no client Appwrite call)
 */
export async function ensureUserBootstrap() {
  const r = await apiFetch("/api/bootstrap");
  return { user: r.user || null, profile: r.profile || null };
}

/* =========================
   VERIFY CODE (EMAIL)
   ========================= */

export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  return apiFetch("/api/auth/send-verify-code", {
    method: "POST",
    body: { userId: id },
  });
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();

  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  return apiFetch("/api/auth/verify-code", {
    method: "POST",
    body: { userId: id, code: c },
  });
}

/* =========================
   PASSWORD RECOVERY
   ========================= */

/**
 * Sends recovery email via server route.
 * IMPORTANT: Appwrite does NOT need console "Redirect URLs" for recovery.
 * The redirect URL is passed in the request (server constructs it).
 */
export async function sendPasswordRecovery(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("Missing email.");

  return apiFetch("/api/auth/recovery", {
    method: "POST",
    body: { email: e },
  });
}

/**
 * Completes recovery (userId + secret from the email link) + new password.
 * Supports both:
 *   resetPasswordWithRecovery({ userId, secret, password })
 * and:
 *   resetPasswordWithRecovery(userId, secret, password)
 */
export async function resetPasswordWithRecovery(a, b, c) {
  let userId = "";
  let secret = "";
  let password = "";

  if (a && typeof a === "object") {
    userId = String(a.userId || "").trim();
    secret = String(a.secret || "").trim();
    password = String(a.password || "");
  } else {
    userId = String(a || "").trim();
    secret = String(b || "").trim();
    password = String(c || "");
  }

  if (!userId) throw new Error("Missing userId.");
  if (!secret) throw new Error("Missing secret.");
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters.");

  return apiFetch("/api/auth/recovery-complete", {
    method: "POST",
    body: { userId, secret, password },
  });
}

/* =========================
   OPTIONAL DEFAULT EXPORT
   ========================= */
export default {
  getErrorMessage,
  signIn,
  signUp,
  signOut,
  logoutUser,
  getCurrentUser,
  ensureUserBootstrap,
  createOrRefreshVerifyCode,
  verifySixDigitCode,
  sendPasswordRecovery,
  resetPasswordWithRecovery,
};

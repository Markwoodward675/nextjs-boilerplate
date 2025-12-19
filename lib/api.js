// lib/api.js
"use client";

import { account, APPWRITE_ENV } from "./appwriteClient";

/** ---------------------------
 * Errors
 * -------------------------- */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;
  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

async function apiJson(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || json?.message || `Request failed: ${res.status}`);
  }
  return json;
}

/** ---------------------------
 * Session / Auth (SERVER ROUTES — no CORS)
 * -------------------------- */

// Backwards compatible: signUp({fullName,email,password,referralId}) OR signUp(fullName,email,password)
export async function signUp(a, b, c, d) {
  let fullName, email, password, referralId;

  if (typeof a === "object" && a) {
    fullName = a.fullName;
    email = a.email;
    password = a.password;
    referralId = a.referralId || "";
  } else {
    fullName = a;
    email = b;
    password = c;
    referralId = d || "";
  }

  const name = String(fullName || "").trim();
  const em = String(email || "").trim().toLowerCase();
  const pw = String(password || "");

  if (!name) throw new Error("Full name is required.");
  if (!em) throw new Error("Email is required.");
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.");

  try {
    // Server route creates account + session cookie
    await apiJson("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ fullName: name, email: em, password: pw, referralId }),
    });
    return true;
  } catch (e) {
    const msg = getErrorMessage(e, "Unable to create account.");

    // If user exists, decide verify vs signin
    if (/already exists/i.test(msg) || /409/.test(msg)) {
      // try sign in with the same credentials
      try {
        await signIn(em, pw);
        const boot = await ensureUserBootstrap();

        if (boot?.profile?.verificationCodeVerified) {
          // verified -> logout and send to signin
          await signOut();
          throw new Error("Account already exists. Please sign in.");
        }
        // not verified -> allow verify flow
        return true;
      } catch (e2) {
        throw new Error("Account already exists. Please sign in.");
      }
    }

    throw e;
  }
}

export async function signIn(email, password) {
  const em = String(email || "").trim().toLowerCase();
  const pw = String(password || "");
  if (!em || !pw) throw new Error("Email and password are required.");

  // Always allow sign-in even if a session is active:
  // server route deletes current session (if any) then creates a fresh one.
  await apiJson("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email: em, password: pw }),
  });

  return true;
}

export async function signOut() {
  await apiJson("/api/auth/signout", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
  return true;
}

export async function getCurrentUser() {
  // Prefer server bootstrap
  const r = await apiJson("/api/bootstrap", { method: "GET" }).catch(() => null);
  return r?.user || null;
}

/** ---------------------------
 * Bootstrap (user_profile + wallets) via server
 * -------------------------- */
export async function ensureUserBootstrap() {
  const data = await apiJson("/api/bootstrap", { method: "GET" });
  if (!data?.user?.$id) throw new Error("We couldn’t confirm your session. Please sign in again.");
  return { user: data.user, profile: data.profile || null, userId: data.userId || data.user.$id };
}

/** ---------------------------
 * Verify Code
 * -------------------------- */
export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const json = await apiJson("/api/auth/send-verify-code", {
    method: "POST",
    body: JSON.stringify({ userId: id }),
  });

  return Boolean(json?.ok);
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const json = await apiJson("/api/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ userId: id, code: c }),
  });

  return Boolean(json?.ok);
}

/** ---------------------------
 * Password Recovery (keep SDK, but must pass a VALID absolute URL)
 * -------------------------- */
function getAppOrigin() {
  const env = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export async function requestPasswordRecovery(email) {
  const em = String(email || "").trim().toLowerCase();
  if (!em) throw new Error("Email is required.");

  const origin = getAppOrigin();
  if (!origin || !/^https?:\/\//i.test(origin)) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set to a valid URL (e.g. https://day-trader-insights.com).");
  }

  // Send users to /verify (or create a dedicated /reset-password page)
  const redirectUrl = new URL("/verify", origin).toString();

  await account.createRecovery(em, redirectUrl);
  return true;
}

export const APP_DEBUG = { APPWRITE_ENV };

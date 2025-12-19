// lib/api.js
"use client";

import { getPublicConfig } from "./appwrite";

function _asText(x) {
  try {
    return typeof x === "string" ? x : JSON.stringify(x);
  } catch {
    return String(x);
  }
}

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const m =
    err?.message ||
    err?.error ||
    err?.response?.message ||
    err?.response ||
    "";
  const s = String(m || "").trim();
  return s ? s : fallback;
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const e = new Error(msg);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

export function isAppwriteConfigured() {
  const cfg = getPublicConfig?.();
  return Boolean(cfg?.ENDPOINT && cfg?.PROJECT_ID);
}

// ---------------- AUTH (via API routes) ----------------

export async function signUp({ fullName, email, password, referralId = "" }) {
  return apiFetch("/api/auth/signup", {
    method: "POST",
    body: { fullName, email, password, referralId },
  });
}

// IMPORTANT: signIn must work even if session exists -> route will auto-logout current first
export async function signIn(email, password) {
  return apiFetch("/api/auth/signin", {
    method: "POST",
    body: { email, password },
  });
}

export async function signOut() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function me() {
  return apiFetch("/api/auth/me");
}

// Used for signup conflict UX: is user verified or not?
export async function getAccountStatusByEmail(email) {
  return apiFetch("/api/auth/account-status", { method: "POST", body: { email } });
}

// ---------------- BOOTSTRAP ----------------

export async function ensureUserBootstrap() {
  const r = await apiFetch("/api/bootstrap");
  return { user: r.user || null, profile: r.profile || null };
}

// ---------------- VERIFY CODE ----------------

export async function createOrRefreshVerifyCode(userId) {
  if (!userId) throw new Error("Missing userId.");
  return apiFetch("/api/auth/send-verify-code", { method: "POST", body: { userId } });
}

export async function verifySixDigitCode(userId, code) {
  if (!userId) throw new Error("Missing userId.");
  return apiFetch("/api/auth/verify-code", { method: "POST", body: { userId, code } });
}

// ---------------- RECOVERY ----------------

export async function requestPasswordRecovery(email) {
  return apiFetch("/api/auth/recovery", { method: "POST", body: { email } });
}

export async function completePasswordRecovery({ userId, secret, password }) {
  return apiFetch("/api/auth/recovery-complete", {
    method: "POST",
    body: { userId, secret, password },
  });
}

// Debug helper
export function dumpPublicConfig() {
  return _asText(getPublicConfig?.());
}

"use client";

import { getAppwrite, isAppwriteConfigured, ENDPOINT, PROJECT_ID } from "./appwriteClient";

/* -------------------- CONSTANTS / ENUMS -------------------- */

export const ENUM = {
  currencyType: ["USD", "EUR", "JPY", "GBP"],
  transactionType: [
    "deposit",
    "withdraw",
    "transfer",
    "refund",
    "invest",
    "trade",
    "giftcard_buy",
    "giftcard_sell",
    "admin_adjustment",
    "commission",
  ],
  alertSeverity: ["low", "medium", "high", "critical"],
};

export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  return String(msg).replace(/^AppwriteException:\s*/i, "");
}

/* -------------------- URL helpers -------------------- */

function normalizeAbsoluteUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return "";
}

function getPublicAppUrl() {
  // Must be absolute https://...
  const env = normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (env) return env;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/* -------------------- Appwrite SDK compat -------------------- */

export async function createEmailSessionCompat(email, password) {
  const { account } = getAppwrite();

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');

  const create =
    (typeof account?.createEmailPasswordSession === "function" && account.createEmailPasswordSession.bind(account)) ||
    (typeof account?.createEmailSession === "function" && account.createEmailSession.bind(account)) ||
    (typeof account?.createSession === "function" && account.createSession.bind(account));

  if (!create) {
    throw new Error(
      "Appwrite SDK email session method not found. Ensure you installed the browser SDK package: `appwrite`."
    );
  }

  try {
    return await create(e, p);
  } catch (err) {
    const msg = getErrorMessage(err, "");

    // HARD FIX: if a session is active, delete current then retry
    if (/session is active|prohibited when a session is active/i.test(msg)) {
      try {
        await account.deleteSession("current");
      } catch {
        // ignore
      }
      return await create(e, p);
    }

    throw err;
  }
}

/* -------------------- AUTH -------------------- */

export async function signUp(payloadOrEmail, passwordMaybe, fullNameMaybe) {
  if (!isAppwriteConfigured()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }

  const { account } = getAppwrite();

  let email, password, fullName;
  if (payloadOrEmail && typeof payloadOrEmail === "object") {
    email = payloadOrEmail.email;
    password = payloadOrEmail.password;
    fullName = payloadOrEmail.fullName;
  } else {
    email = payloadOrEmail;
    password = passwordMaybe;
    fullName = fullNameMaybe;
  }

  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  const n = String(fullName || "").trim();

  if (!e) throw new Error('Missing required parameter: "email"');
  if (!p) throw new Error('Missing required parameter: "password"');
  if (p.length < 8) throw new Error("Password must be at least 8 characters.");

  await account.create((crypto?.randomUUID?.() || undefined), e, p, n || undefined);

  // Create session
  await createEmailSessionCompat(e, p);

  // Bootstrap (creates user_profile server-side)
  await ensureUserBootstrap();

  return true;
}

export async function signIn(email, password) {
  if (!isAppwriteConfigured()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  await createEmailSessionCompat(email, password);
  return true;
}

export async function signOut() {
  try {
    const { account } = getAppwrite();
    await account.deleteSession("current");
  } catch {
    // ignore
  }
  return true;
}

export async function getCurrentUser() {
  try {
    const { account } = getAppwrite();
    return await account.get();
  } catch {
    return null;
  }
}

/* -------------------- BOOTSTRAP --------------------
   Uses your POST /api/bootstrap route with { userId: me.$id }
----------------------------------------------------- */

export async function ensureUserBootstrap() {
  const me = await getCurrentUser();
  if (!me?.$id) return { user: null, profile: null };

  const res = await fetch("/api/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: me.$id }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Bootstrap failed.");
  }

  return { user: data.user, profile: data.profile };
}

/* -------------------- VERIFY CODE -------------------- */

export async function createOrRefreshVerifyCode(userId) {
  const id = String(userId || "").trim();
  if (!id) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return true;
}

export async function verifySixDigitCode(userId, code) {
  const id = String(userId || "").trim();
  const c = String(code || "").trim();
  if (!id) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: id, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");

  return true;
}

/* -------------------- PASSWORD RECOVERY -------------------- */

export async function requestPasswordRecovery(email) {
  const { account } = getAppwrite();

  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error('Missing required parameter: "email"');

  const base = getPublicAppUrl();
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL. Set it to https://day-trader-insights.com");

  const redirectUrl = `${base}/reset-password`;
  if (!/^https?:\/\//i.test(redirectUrl)) throw new Error("Invalid `url` param: Invalid URI.");

  return await account.createRecovery(e, redirectUrl);
}

export async function completePasswordRecovery({ userId, secret, password, passwordAgain }) {
  const { account } = getAppwrite();

  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const p1 = String(password || "");
  const p2 = String(passwordAgain || "");

  if (!uid || !sec) throw new Error("Invalid recovery link.");
  if (!p1) throw new Error('Missing required parameter: "password"');
  if (p1 !== p2) throw new Error("Passwords do not match.");

  return await account.updateRecovery(uid, sec, p1, p2);
}

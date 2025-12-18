// lib/api.js
"use client";

import { requireClient } from "./appwriteClient";

/* ----------------------------- Errors ----------------------------- */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response ||
    err?.error ||
    fallback;

  const s = String(msg);

  // Helpful CORS hint
  if (/cors|access-control-allow-origin|blocked by cors/i.test(s)) {
    return (
      "CORS blocked your request. In Appwrite Console → Platforms (Web), add your Vercel domains (both *.vercel.app + your custom domain)."
    );
  }

  return s.replace(/^AppwriteException:\s*/i, "");
}

/* ----------------------------- Config ----------------------------- */
function cfg() {
  const { cfg } = requireClient();
  if (!cfg.databaseId) {
    throw new Error(
      "Appwrite database (DB_ID) is not configured. Set NEXT_PUBLIC_APPWRITE_DATABASE_ID in Vercel."
    );
  }
  return cfg;
}

/* ----------------------------- Core ----------------------------- */
export async function getCurrentUser() {
  const { account } = requireClient();
  return await account.get();
}

export async function signOut() {
  const { account } = requireClient();
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }
  return true;
}

/**
 * signIn must succeed even if a session is already active.
 * If Appwrite blocks session creation, we wipe sessions and retry.
 */
export async function signIn(email, password) {
  const { account } = requireClient();
  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  try {
    return await account.createEmailPasswordSession(email, password);
  } catch (e) {
    const msg = getErrorMessage(e);

    if (/session is active|prohibited when a session is active/i.test(msg)) {
      await signOut();
      return await account.createEmailPasswordSession(email, password);
    }

    throw new Error(msg);
  }
}

/* ----------------------- user_profile bootstrap ----------------------- */
/**
 * SINGLE SOURCE OF TRUTH: user_profile collection
 * Document ID = user.$id
 */
export async function ensureUserBootstrap() {
  const { db } = requireClient();
  const c = cfg();

  const user = await getCurrentUser().catch(() => null);
  if (!user?.$id) {
    return { user: null, profile: null };
  }

  const USERS_COL = c.usersCollectionId || "user_profile";
  const docId = user.$id;

  // Read or create profile
  let profile = null;
  try {
    profile = await db.getDocument(c.databaseId, USERS_COL, docId);
  } catch {
    const now = new Date().toISOString();
    try {
      profile = await db.createDocument(c.databaseId, USERS_COL, docId, {
        userId: user.$id,
        email: user.email || "",
        fullName: user.name || "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e2) {
      throw new Error(getErrorMessage(e2, "Unable to create user profile."));
    }
  }

  return { user, profile };
}

/* ----------------------------- Sign Up ----------------------------- */
/**
 * After creating the Appwrite user, we immediately sign in
 * so verify-code page can work reliably.
 *
 * If email exists (409), we attempt sign-in:
 *  - if verified => redirect caller to signin
 *  - if not verified => redirect caller to verify-code
 */
export async function signUp(input) {
  const { account, ID } = requireClient();

  // Accept both object-style and positional (hardfix)
  const fullName =
    typeof input === "object" ? input.fullName : arguments[0];
  const email = typeof input === "object" ? input.email : arguments[1];
  const password =
    typeof input === "object" ? input.password : arguments[2];

  const referralId = typeof input === "object" ? input.referralId : "";

  if (!email) throw new Error('Missing required parameter: "email"');
  if (!password) throw new Error('Missing required parameter: "password"');

  try {
    // Create user
    await account.create(ID.unique(), email, password, fullName || "");

    // Create session
    await signIn(email, password);

    // Bootstrap user_profile doc
    const { db } = requireClient();
    const c = cfg();
    const now = new Date().toISOString();
    const USERS_COL = c.usersCollectionId || "user_profile";
    const me = await getCurrentUser();

    // Update or create profile doc with safe schema only
    try {
      await db.getDocument(c.databaseId, USERS_COL, me.$id);
      await db.updateDocument(c.databaseId, USERS_COL, me.$id, {
        userId: me.$id,
        email: me.email || email,
        fullName: fullName || me.name || "",
        updatedAt: now,
        // store referralId only if your schema has it; if not, omit
        // referrerAffiliateId: referralId ? Number(referralId) : null,
      });
    } catch {
      await db.createDocument(c.databaseId, USERS_COL, me.$id, {
        userId: me.$id,
        email: me.email || email,
        fullName: fullName || me.name || "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { ok: true, referralId };
  } catch (e) {
    const msg = getErrorMessage(e);

    // Existing user
    if (/409|already exists/i.test(msg)) {
      // Try sign-in with provided password (best UX)
      try {
        await signIn(email, password);
        const boot = await ensureUserBootstrap();

        if (boot?.profile?.verificationCodeVerified) {
          // verified user => you want them on signin page
          await signOut();
          return { ok: false, exists: true, verified: true };
        }

        // not verified => go verify-code
        return { ok: false, exists: true, verified: false };
      } catch {
        // Wrong password or blocked: just signal exists
        return { ok: false, exists: true, verified: null };
      }
    }

    throw new Error(msg);
  }
}

/* -------------------------- Verify Code -------------------------- */
export async function createOrRefreshVerifyCode(userId) {
  if (!userId) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  if (!userId) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(String(code || ""))) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Verify failed.");
  return data;
}

/* ---------------------- Password Recovery ---------------------- */
export async function requestPasswordRecovery(email) {
  const { account } = requireClient();
  const c = cfg();

  const base = c.appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  if (!base || !/^https?:\/\//i.test(base)) {
    throw new Error(
      "Invalid recovery redirect URL. Set NEXT_PUBLIC_APP_URL to your domain (e.g. https://day-trader-insights.com)."
    );
  }

  // You should create /reset-password page later; for now we point to it.
  const redirectUrl = `${base.replace(/\/$/, "")}/reset-password`;

  return await account.createRecovery(email, redirectUrl);
}

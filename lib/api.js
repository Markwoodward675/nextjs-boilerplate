"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/**
 * CLIENT-SIDE Appwrite helper (Next.js App Router)
 * - Uses Appwrite Web SDK ("appwrite")
 * - Avoids duplicate exports / mixed module syntax
 * - Provides stable function signatures used by your pages
 */

let _sdk = null;

function getEnv(name, fallback = "") {
  const v = process.env[name];
  return (v ?? fallback).toString().trim();
}

function getAppUrl() {
  // Prefer explicit env, fallback to browser origin
  const fromEnv = getEnv("NEXT_PUBLIC_APP_URL");
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return ""; // will be handled with a clear error when needed
}

function sdk() {
  if (_sdk) return _sdk;

  const endpoint = getEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  const projectId = getEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");

  if (!endpoint || !projectId) {
    throw new Error(
      "Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  _sdk = {
    client,
    account: new Account(client),
    db: new Databases(client),
    storage: new Storage(client),
  };

  return _sdk;
}

/** Robust error message extraction */
export function getErrorMessage(err, fallback = "Something went wrong.") {
  const msg =
    err?.message ||
    err?.response?.message ||
    err?.response?.error ||
    err?.response ||
    "";

  const s = String(msg || "").trim();

  // Common CORS symptom
  if (
    s.includes("blocked by CORS policy") ||
    s.includes("No 'Access-Control-Allow-Origin'") ||
    s.includes("ERR_FAILED") ||
    s.toLowerCase().includes("network request failed")
  ) {
    return (
      "Network/CORS blocked. Add your Vercel domain + day-trader-insights.com as a Web Platform in Appwrite, then retry."
    );
  }

  return s || fallback;
}

function isConflict(err) {
  const code = err?.code || err?.response?.code;
  const message = String(err?.message || err?.response?.message || "");
  return code === 409 || message.includes("already exists");
}

/** Helpers for DB ids */
function getDbId() {
  // You have both vars in Vercel, so support both
  return (
    getEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID") ||
    getEnv("NEXT_PUBLIC_APPWRITE_DB_ID") ||
    getEnv("NEXT_PUBLIC_APPWRITE_DATABASE") ||
    ""
  );
}

function uniq(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

/**
 * Try to load a profile doc from whichever collection is configured.
 * We try multiple candidates because your envs vary across iterations.
 */
async function loadProfileForUser(userId) {
  const { db } = sdk();
  const DB_ID = getDbId();
  if (!DB_ID) return { profile: null, profileCol: null };

  const candidates = uniq([
    getEnv("NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID"),
    getEnv("NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID"),
    "profiles",
    "user_profile",
  ]);

  for (const col of candidates) {
    try {
      // 1) docId == userId (your API routes do this often)
      try {
        const doc = await db.getDocument(DB_ID, col, userId);
        return { profile: doc, profileCol: col };
      } catch {}

      // 2) otherwise search by userId field
      try {
        const list = await db.listDocuments(DB_ID, col, [
          Query.equal("userId", [userId]),
          Query.limit(1),
        ]);
        if (list?.documents?.[0]) {
          return { profile: list.documents[0], profileCol: col };
        }
      } catch {}
    } catch {
      // collection not found or not permitted
    }
  }

  return { profile: null, profileCol: null };
}

/**
 * Create a minimal profile doc if missing (best-effort).
 * IMPORTANT: we only write fields that exist in your schema variants.
 */
async function ensureProfileDoc(user) {
  const { db } = sdk();
  const DB_ID = getDbId();
  if (!DB_ID) return { profile: null, profileCol: null };

  const now = new Date().toISOString();

  const candidates = uniq([
    getEnv("NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID"),
    getEnv("NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID"),
    "profiles",
    "user_profile",
  ]);

  for (const col of candidates) {
    try {
      const existing = await loadProfileForUser(user.$id);
      if (existing?.profile) return existing;

      // Try create with docId=userId
      const payload = {
        userId: user.$id,
        email: user.email,
        fullName: user.name || "",
        verificationCodeVerified: false,
        createdAt: now,
      };

      try {
        const doc = await db.createDocument(DB_ID, col, user.$id, payload);
        return { profile: doc, profileCol: col };
      } catch {
        // Fallback: random docId
        const doc = await db.createDocument(DB_ID, col, ID.unique(), payload);
        return { profile: doc, profileCol: col };
      }
    } catch {
      // try next candidate
    }
  }

  // If none worked, just continue without profile (your UI can still work)
  return { profile: null, profileCol: null };
}

/** -------- AUTH -------- */

async function createEmailSession(email, password) {
  const { account } = sdk();

  // SDK differences: createEmailPasswordSession vs createEmailSession :contentReference[oaicite:3]{index=3}
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }
  throw new Error(
    "Your Appwrite SDK is missing email session method. Ensure `appwrite` web SDK is installed."
  );
}

export async function signOut() {
  const { account } = sdk();
  try {
    await account.deleteSession("current");
  } catch {
    // fallback
    await account.deleteSessions();
  }
  return true;
}

export async function ensureUserBootstrap() {
  const { account } = sdk();
  const user = await account.get(); // throws if not signed in

  // Best-effort profile ensure
  const ensured = await ensureProfileDoc(user);

  return {
    user,
    profile: ensured?.profile || null,
    profileCol: ensured?.profileCol || null,
  };
}

export async function signIn(emailOrObj, passwordMaybe) {
  const email =
    typeof emailOrObj === "object"
      ? String(emailOrObj?.email || "").trim()
      : String(emailOrObj || "").trim();

  const password =
    typeof emailOrObj === "object"
      ? String(emailOrObj?.password || "")
      : String(passwordMaybe || "");

  if (!email) throw new Error("Missing required parameter: \"email\"");
  if (!password) throw new Error("Missing required parameter: \"password\"");

  await createEmailSession(email, password);

  const boot = await ensureUserBootstrap();

  // If not verified, keep them in verify flow
  const verified = !!boot?.profile?.verificationCodeVerified;

  return {
    ok: true,
    boot,
    next: verified ? "/dashboard" : "/verify-code",
  };
}

export async function signUp(arg1, arg2, arg3, arg4) {
  // supports:
  // signUp({ fullName, email, password, referralId })
  // signUp(fullName, email, password, referralId)
  const fullName =
    typeof arg1 === "object" ? String(arg1?.fullName || "") : String(arg1 || "");
  const email =
    typeof arg1 === "object" ? String(arg1?.email || "") : String(arg2 || "");
  const password =
    typeof arg1 === "object"
      ? String(arg1?.password || "")
      : String(arg3 || "");
  const referralId =
    typeof arg1 === "object"
      ? String(arg1?.referralId || "")
      : String(arg4 || "");

  const { account } = sdk();

  if (!email.trim()) throw new Error("Missing required parameter: \"email\"");
  if (!password) throw new Error("Missing required parameter: \"password\"");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  try {
    // Create account :contentReference[oaicite:4]{index=4}
    await account.create(ID.unique(), email.trim(), password, fullName.trim());

    // Immediately sign in
    const res = await signIn(email.trim(), password);

    // Send verify code right away (best-effort)
    if (res?.next === "/verify-code") {
      try {
        await createOrRefreshVerifyCode(res.boot.user.$id);
      } catch {}
    }

    return res;
  } catch (e) {
    // If user already exists:
    if (isConflict(e)) {
      // Try signing in with the password they typed (common case: they already registered earlier)
      try {
        const res = await signIn(email.trim(), password);

        // If already verified -> go signin/dashboard accordingly
        if (res?.next === "/dashboard") {
          return { ok: true, boot: res.boot, next: "/dashboard", reason: "already-verified" };
        }

        // Not verified -> send code again and go verify
        try {
          await createOrRefreshVerifyCode(res.boot.user.$id);
        } catch {}
        return { ok: true, boot: res.boot, next: "/verify-code", reason: "exists-not-verified" };
      } catch {
        // Can't sign in -> user exists with different password
        // UX rule requested:
        // - If verified -> go /signin
        // - If not verified -> go /verify-code
        // We can’t read verification state without a session, so return a strong hint:
        const err = new Error(
          "Account already exists. If you created it before, sign in with your original password. If you’re unverified, sign in then complete verification."
        );
        err.code = 409;
        err.next = "/signin";
        throw err;
      }
    }

    throw e;
  }
}

/** -------- VERIFY CODE (Email via your API routes) -------- */

export async function createOrRefreshVerifyCode(userId) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId.");

  const res = await fetch("/api/auth/send-verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Unable to send verification code.");
  return data;
}

export async function verifySixDigitCode(userId, code) {
  const uid = String(userId || "").trim();
  const c = String(code || "").trim();

  if (!uid) throw new Error("Missing userId.");
  if (!/^\d{6}$/.test(c)) throw new Error("Code must be 6 digits.");

  const res = await fetch("/api/auth/verify-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: uid, code: c }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Invalid or expired code.");
  return data;
}

/** -------- PASSWORD RECOVERY -------- */

export async function requestPasswordRecovery(email) {
  const { account } = sdk();
  const e = String(email || "").trim();
  if (!e) throw new Error("Missing required parameter: \"email\"");

  const appUrl = getAppUrl();
  if (!appUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_APP_URL. Set it to https://day-trader-insights.com"
    );
  }

  // Appwrite requires a full redirect URL here :contentReference[oaicite:5]{index=5}
  const redirectUrl = `${appUrl}/reset-password`;

  return await account.createRecovery(e, redirectUrl);
}

export async function updatePasswordRecovery(userId, secret, newPassword) {
  const { account } = sdk();
  const uid = String(userId || "").trim();
  const sec = String(secret || "").trim();
  const pw = String(newPassword || "");

  if (!uid) throw new Error("Missing userId.");
  if (!sec) throw new Error("Missing secret.");
  if (!pw) throw new Error("Missing new password.");

  // Appwrite: PUT /account/recovery :contentReference[oaicite:6]{index=6}
  return await account.updateRecovery(uid, sec, pw);
}

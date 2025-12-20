"use client";

import {
  account,
  client,
  db,
  storage,
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
  ENUM,
  ID,
  Query,
  errMsg,
  isConfigured,
  getPublicConfig,
  requireClient,
  requireSession,
} from "./appwriteClient";

export {
  account,
  client,
  db,
  storage,
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
  ENUM,
  ID,
  Query,
  errMsg,
  isConfigured,
  getPublicConfig,
  requireClient,
  requireSession,
};

/** Name used by your pages/logs */
export const isAppwriteConfigured = () => isConfigured();

/**
 * Fixes:
 * - "a.createEmailPasswordSession is not a function"
 * - "Cannot read properties of undefined (reading 'bind')" (don’t destructure methods)
 * - "Creation of a session is prohibited when a session is active." (we clear sessions first)
 */
export async function createEmailSessionCompat(email, password) {
  if (!email || !password) throw new Error("Email and password are required.");

  // Hard-fix: if session exists, clear it first.
  try {
    await account.deleteSessions();
  } catch {
    // ignore
  }

  // SDK method name differs by version
  if (typeof account.createEmailPasswordSession === "function") {
    return await account.createEmailPasswordSession(email, password);
  }
  if (typeof account.createEmailSession === "function") {
    return await account.createEmailSession(email, password);
  }

  // Last-resort REST fallback (still needs correct Appwrite CORS platform settings)
  const r = await fetch(`${ENDPOINT}/account/sessions/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-appwrite-project": PROJECT_ID,
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Unable to create session.");
  return data;
}

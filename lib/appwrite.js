// lib/appwrite.js
"use client";

import { account, ENDPOINT, PROJECT_ID, DB_ID, errMsg } from "./appwriteClient";

export { account };

export function isAppwriteConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function isDbConfigured() {
  return Boolean(DB_ID);
}

/**
 * Appwrite SDK versions differ:
 * - account.createEmailPasswordSession(email, password) (newer)
 * - account.createEmailSession(email, password) (older)
 *
 * Also Appwrite may reject creating a session when one is active.
 * We fix that by deleting current session and retrying once.
 */
export async function createEmailSessionCompat(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e || !p) throw new Error("Missing email or password.");

  const create =
    account?.createEmailPasswordSession?.bind?.(account) ||
    account?.createEmailSession?.bind?.(account);

  if (!create) {
    throw new Error(
      "Your Appwrite SDK does not support email sessions. Update appwrite package."
    );
  }

  try {
    return await create(e, p);
  } catch (ex) {
    const m = errMsg(ex, "Unable to sign in.");

    // “Creation of a session is prohibited when a session is active.”
    if (/session is active|prohibited when a session is active/i.test(m)) {
      try {
        await account.deleteSession("current");
      } catch {
        // ignore
      }
      return await create(e, p);
    }

    throw new Error(m);
  }
}

export async function safeSignOut() {
  try {
    await account.deleteSession("current");
  } catch {
    // ignore
  }
}

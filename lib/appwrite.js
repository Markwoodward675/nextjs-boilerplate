// lib/appwrite.js
"use client";

import { client, account, db, storage, DB_ID, COLLECTIONS, getPublicConfig, requireClient } from "./appwriteClient";

export { client, account, db, storage, DB_ID, COLLECTIONS, getPublicConfig, requireClient };

export function isAppwriteConfigured() {
  const cfg = getPublicConfig();
  return Boolean(cfg?.configured);
}

export async function createEmailSessionCompat(email, password) {
  // Supports different SDK versions (createEmailPasswordSession vs createEmailSession)
  const e = String(email || "").trim();
  const p = String(password || "");

  if (!e || !p) throw new Error('Missing required parameter: "email" or "password".');

  if (typeof account?.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(e, p);
  }
  if (typeof account?.createEmailSession === "function") {
    return account.createEmailSession(e, p);
  }

  throw new Error(
    "Your Appwrite SDK is missing email session method. Upgrade the 'appwrite' package."
  );
}

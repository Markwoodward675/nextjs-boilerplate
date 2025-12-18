// lib/appwrite.js
"use client";

export {
  client,
  account,
  db,
  storage,
  ID,
  Query,
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
  ENUM,
  isConfigured,
  errMsg,
  requireSession,
  requireClient,
  getPublicConfig,
} from "./appwriteClient";

/**
 * Alias expected by older pages
 */
export function isAppwriteConfigured() {
  // must be a function (some pages call it)
  // eslint-disable-next-line no-undef
  const { isConfigured } = require("./appwriteClient");
  return isConfigured();
}

/**
 * Appwrite SDK compat:
 * - Newer SDKs: account.createEmailPasswordSession(email, password)
 * - Older SDKs: account.createEmailSession(email, password)
 */
export async function createEmailSessionCompat(account, email, password) {
  const fn =
    account?.createEmailPasswordSession ||
    account?.createEmailSession;

  if (!fn) {
    throw new Error(
      "Appwrite SDK session method not found. Ensure `appwrite` package is installed and up to date."
    );
  }

  return await fn.call(account, email, password);
}

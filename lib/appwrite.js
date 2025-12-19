// lib/appwrite.js
"use client";

// Keep this file as a compatibility layer so old pages don't break.
export {
  ENDPOINT,
  PROJECT_ID,
  DB_ID,
  BUCKET_ID,
  COL,
  ENUM,
  client,
  account,
  db,
  storage,
  ID,
  Query,
  errMsg,
  isConfigured,
  createEmailSessionCompat,
  requireSession,
  getPublicConfig,
  requireClient,
} from "./appwriteClient";

// Old names some pages used
export const isAppwriteConfigured = isConfigured;

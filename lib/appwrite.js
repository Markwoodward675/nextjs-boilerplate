"use client";

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
  isAppwriteConfigured,
  getPublicConfig,
  requireClient,
  requireSession
} from "./appwriteClient";

// Many places import this name specifically:
export function isAppwriteConfiguredSafe() {
  return isConfigured();
}

"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

export const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
export const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

// IMPORTANT: DB is optional for auth flow (don’t crash if missing)
export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.APPWRITE_DATABASE_ID ||
  "";

export const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_UPLOADS_BUCKET_ID ||
  process.env.APPWRITE_BUCKET_ID ||
  "";

let _client = null;
let _account = null;
let _db = null;
let _storage = null;

export function isAppwriteConfigured() {
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function getAppwrite() {
  if (_client) {
    return { client: _client, account: _account, db: _db, storage: _storage };
  }

  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }

  _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  _account = new Account(_client);
  _db = new Databases(_client);
  _storage = new Storage(_client);

  return { client: _client, account: _account, db: _db, storage: _storage };
}

export { ID, Query };

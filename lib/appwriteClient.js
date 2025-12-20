// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

/**
 * Client-side Appwrite SDK wrapper.
 * Exports EVERYTHING that your pages import (DB_ID, COL, ENUM, errMsg, requireSession, etc.)
 */

// ---- Public ENV ----
export const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
  process.env.APPWRITE_ENDPOINT ||
  "";

export const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_PROJECT_ID ||
  "";

export const DB_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE ||
  process.env.APPWRITE_DATABASE_ID ||
  process.env.APPWRITE_DB_ID ||
  "";

// Optional (safe even if unused)
export const BUCKET_ID =
  process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID ||
  process.env.APPWRITE_BUCKET_ID ||
  "";

// ---- Collections (defaults match your “single source of truth”) ----
export const COL = Object.freeze({
  user_profile:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_USER_PROFILE_COLLECTION_ID ||
    "user_profile",

  verify_codes:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    "verify_codes",

  wallets:
    process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",

  transactions:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",

  alerts:
    process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",

  affiliates:
    process.env.NEXT_PUBLIC_APPWRITE_AFFILIATES_COLLECTION_ID || "affiliates",
});

// ---- Enums (your pages import ENUM) ----
export const ENUM = Object.freeze({
  KYC_STATUS: Object.freeze({
    NOT_SUBMITTED: "not_submitted",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  }),

  WALLET_KIND: Object.freeze({
    MAIN: "main",
    TRADING: "trading",
    AFFILIATE: "affiliate",
  }),

  TX_STATUS: Object.freeze({
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
  }),
});

// ---- Configuration guards ----
export const isConfigured = Boolean(ENDPOINT && PROJECT_ID);
export const isAppwriteConfigured = isConfigured;

export function getPublicConfig() {
  return { ENDPOINT, PROJECT_ID, DB_ID, BUCKET_ID, COL, ENUM, isConfigured };
}

let _client = null;
let _account = null;
let _db = null;
let _storage = null;

function init() {
  if (_client || !isConfigured) return;

  const c = new Client();
  c.setEndpoint(ENDPOINT);
  c.setProject(PROJECT_ID);

  _client = c;
  _account = new Account(c);
  _db = new Databases(c);
  _storage = new Storage(c);
}

export function requireClient() {
  if (!isConfigured) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID (and NEXT_PUBLIC_APPWRITE_DATABASE_ID if you use DB)."
    );
  }
  init();
  return { client: _client, account: _account, db: _db, storage: _storage };
}

// Exported instances (may be null if env missing, but available when configured)
init();
export const client = _client;
export const account = _account;
export const db = _db;
export const storage = _storage;

// ---- Error helper (your UI calls getErrorMessage/errMsg) ----
export function errMsg(e, fallback = "Something went wrong.") {
  const msg =
    e?.message ||
    e?.response?.message ||
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.error ||
    fallback;

  return String(msg || fallback);
}

// ---- Session guard used by protected pages/layouts ----
export async function requireSession() {
  const { account } = requireClient();
  try {
    const me = await account.get();
    return me;
  } catch (e) {
    throw new Error(errMsg(e, "Not signed in."));
  }
}

export { ID, Query };

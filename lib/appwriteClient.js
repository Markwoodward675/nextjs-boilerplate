// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

// Trim to avoid hidden spaces/newlines from Vercel env UI
const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const PROJECT_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();
const DB = (process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "").trim();
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;

export const BUCKET_ID = (process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads").trim();

export const isClientConfigured =
  Boolean(ENDPOINT) && ENDPOINT.startsWith("http") && Boolean(PROJECT_ID);

export const isDatabaseConfigured = Boolean(DB);

export function assertConfigured({ requireDb = false } = {}) {
  if (!isClientConfigured) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
  if (requireDb && !isDatabaseConfigured) {
    throw new Error("Appwrite database (DB_ID) is not configured.");
  }
}

// Build-safe: no throws at import time
export const client = new Client();

if (isClientConfigured) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export const account = new Account(client);
export const db = new Databases(client);
export const storage = new Storage(client);

export const DB_ID = DB;

// Collections (your exact names)
export const COL = {
  PROFILES: "profiles",
  USER_PROFILE: "user_profile",
  WALLETS: "wallets",
  TX: "transactions",
  ALERTS: "alerts",
  VERIFY_CODES: "verify_codes",
  AFF_ACCOUNT: "affiliate_account",
  AFF_REFERRALS: "affiliate_referrals",
  AFF_COMMISSIONS: "affiliate_commissions",
};

// Enums (keep your current values)
export const ENUM = {
  ALERT_SEVERITY: "info",
  TX_STATUS_PENDING: "pending",
  TX_STATUS_APPROVED: "approved",
  CURRENCY_USD: "USD",
  TX_TYPE_DEPOSIT: "deposit",
  TX_TYPE_WITHDRAW: "withdraw",
  TX_TYPE_INVEST: "invest",
  TX_TYPE_ROI: "invest_roi",
  TX_TYPE_AFF: "affiliate_commission",
  TX_TYPE_GC_BUY: "giftcard_buy",
  TX_TYPE_GC_SELL: "giftcard_sell",
  TX_TYPE_TRADE_INTENT: "trade_intent",
  TX_TYPE_AIRDROP: "airdrop",
};

export { ID, Query };

export function errMsg(e, fallback = "Something went wrong.") {
  return String(e?.message || e?.response?.message || fallback).replace(
    /^AppwriteException:\s*/i,
    ""
  );
}

export async function requireSession() {
  assertConfigured(); // only throws when actually used
  const user = await account.get().catch(() => null);
  if (!user?.$id) throw new Error("We couldn’t confirm your session. Please sign in again.");
  return user;
}

// Debug (safe)
if (typeof window !== "undefined") {
  console.log("[AppwriteClient ENV CHECK]", {
    endpointConfigured: Boolean(ENDPOINT),
    projectConfigured: Boolean(PROJECT_ID),
    dbConfigured: Boolean(DB),
    isClientConfigured,
    isDatabaseConfigured,
  });
}

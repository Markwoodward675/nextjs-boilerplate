// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads";

if (!ENDPOINT || !PROJECT) throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT/PROJECT_ID");
if (!DB) throw new Error("Appwrite database (DB_ID) is not configured.");

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT);

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

// Required enums (adjust if your Appwrite enums differ)
export const ENUM = {
  ALERT_SEVERITY: "info",
  TX_STATUS_PENDING: "pending",
  TX_STATUS_APPROVED: "approved",
  CURRENCY_USD: "USD",
  // These must match your enum options:
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

export function errMsg(e, fallback = "Something went wrong.") {
  return String(e?.message || e?.response?.message || fallback).replace(/^AppwriteException:\s*/i, "");
}

export async function requireSession() {
  const user = await account.get().catch(() => null);
  if (!user?.$id) throw new Error("We couldn’t confirm your session. Please sign in again.");
  return user;
}

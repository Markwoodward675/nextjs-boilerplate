// lib/appwrite.js
export const ENV = {
  ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "",
  PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
  DB_ID:
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
    "",
  BUCKET_ID: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
};

export const COL = {
  // Single source of truth:
  USER_PROFILE:
    process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile",

  VERIFY_CODES:
    process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
    "verify_codes",

  WALLETS:
    process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets",

  ALERTS:
    process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts",

  TRANSACTIONS:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions",
};

export const ENUM = {
  ALERT_SEVERITY: ["low", "medium", "high", "critical"],
  TX_CURRENCY: ["USD", "EUR", "JPY", "GBP"],
  TX_TYPE: [
    "deposit",
    "withdraw",
    "transfer",
    "refund",
    "invest",
    "trade",
    "giftcard_buy",
    "giftcard_sell",
    "admin_adjustment",
    "commission",
  ],
};

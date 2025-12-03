"use client";

import { account, databases, ID, Query } from "./appwrite";

/**
 * Read env once so we don't keep touching process.env
 */
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
const USER_PROFILE_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USER_PROFILE_TABLE_ID;
const WALLETS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_TABLE_ID;
const TRANSACTIONS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_TABLE_ID;
const AFFILIATE_ACCOUNT_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_TABLE_ID;
const AFFILIATE_REFERRALS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_REFERRALS_TABLE_ID;
const AFFILIATE_COMMISSIONS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_TABLE_ID;
const ALERTS_TABLE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_ALERTS_TABLE_ID;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getErrorMessage(err, fallback) {
  if (!err) return fallback;

  // Appwrite Web SDK error format
  const anyErr = /** @type {any} */ (err);
  if (anyErr?.message) return anyErr.message;
  if (anyErr?.response?.message) return anyErr.response.message;

  try {
    return JSON.stringify(anyErr);
  } catch {
    return fallback;
  }
}

/**
 * Support BOTH old and new Appwrite SDKs:
 * - New: account.createEmailPasswordSession({ email, password })
 * - Old: account.createEmailSession(email, password)
 */
async function createEmailSessionCompat(email, password) {
  const anyAccount = /** @type {any} */ (account);

  if (typeof anyAccount.createEmailPasswordSession === "function") {
    // New Cloud SDK
    return anyAccount.createEmailPasswordSession({ email, password });
  }

  if (typeof anyAccount.createEmailSession === "function") {
    // Older SDKs
    return anyAccount.createEmailSession(email, password);
  }

  throw new Error(
    "Email/password login is not supported by this Appwrite SDK version."
  );
}

/**
 * Create an account in a way that works with current Cloud syntax.
 * (Most modern SDKs accept an object payload.)
 */
async function createAccountCompat({ name, email, password }) {
  return account.create({
    userId: ID.unique(),
    email,
    password,
    name,
  });
}

/**
 * Bootstrap profile + wallets after first signup.
 */
async function bootstrapUserProfileAndWallets(user, extras) {
  if (!DB_ID || !USER_PROFILE_TABLE_ID) return;

  const now = new Date().toISOString();
  const userId = user.$id;

  // Create profile
  try {
    await databases.createDocument(DB_ID, USER_PROFILE_TABLE_ID, userId, {
      name: user.name || extras?.fullName || "",
      email: user.email,
      role: "USER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  } catch (err) {
    // If it already exists, ignore
    console.warn("bootstrap profile error (safe to ignore if already exists)", err);
  }

  if (!WALLETS_TABLE_ID) return;

  const baseWallet = {
    userId,
    currency: "USD",
    balance: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Create wallets if they don't already exist
  const labels = [
    { type: "MAIN", label: "Main wallet" },
    { type: "TRADING", label: "Trading wallet" },
    { type: "AFFILIATE", label: "Affiliate wallet" },
  ];

  await Promise.all(
    labels.map((w) =>
      databases.createDocument(DB_ID, WALLETS_TABLE_ID, ID.unique(), {
        ...baseWallet,
        type: w.type,
        label: w.label,
      }).catch((err) => {
        console.warn("bootstrap wallet error (might already exist)", w.type, err);
      })
    )
  );
}

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Register (email/password) and auto-log in.
 */
export async function registerUser({ fullName, email, password }) {
  try {
    const user = await createAccountCompat({ name: fullName, email, password });

    // Create login session
    await createEmailSessionCompat(email, password);

    // Bootstrap profile + wallets
    await bootstrapUserProfileAndWallets(user, { fullName });

    return { user };
  } catch (err) {
    console.error("registerUser error", err);
    throw new Error(
      getErrorMessage(
        err,
        "Sign up failed. Please review your details and try again."
      )
    );
  }
}

/**
 * Traditional email/password login.
 */
export async function loginWithEmailPassword(email, password) {
  try {
    await createEmailSessionCompat(email, password);
    const user = await account.get();
    return { user };
  } catch (err) {
    console.error("loginWithEmailPassword error", err);
    throw new Error(
      getErrorMessage(
        err,
        "Sign in failed. Please confirm your email/password and try again."
      )
    );
  }
}

/**
 * Google OAuth login (used by the Google button).
 * Front-end should redirect the browser to this URL.
 */
export function getGoogleOAuthUrl({ successUrl, failureUrl }) {
  // The actual redirect is handled by account.createOAuth2Session in the UI,
  // this helper is just here in case some pages need to compute URLs.
  return {
    success: successUrl,
    failure: failureUrl ?? successUrl,
  };
}

/**
 * Get current logged-in account (or null if not logged in).
 */
export async function getCurrentAccountSafe() {
  try {
    const user = await account.get();
    return user;
  } catch {
    return null;
  }
}

/**
 * Logout current session.
 */
export async function logoutCurrentSession() {
  try {
    await account.deleteSession("current");
  } catch (err) {
    console.error("logout error", err);
    // ignore
  }
}

/* -------------------------------------------------------------------------- */
/*  Profile & Wallets                                                         */
/* -------------------------------------------------------------------------- */

export async function getUserProfileAndWallets() {
  const user = await getCurrentAccountSafe();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  if (!DB_ID) throw new Error("Appwrite DB ID is not configured.");

  const [profile, wallets] = await Promise.all([
    USER_PROFILE_TABLE_ID
      ? databases.getDocument(DB_ID, USER_PROFILE_TABLE_ID, user.$id).catch(
          (err) => {
            console.warn("get profile error", err);
            return null;
          }
        )
      : null,
    WALLETS_TABLE_ID
      ? databases
          .listDocuments(DB_ID, WALLETS_TABLE_ID, [
            Query.equal("userId", user.$id),
          ])
          .then((res) => res.documents)
          .catch((err) => {
            console.warn("get wallets error", err);
            return [];
          })
      : [],
  ]);

  return { user, profile, wallets };
}

/* -------------------------------------------------------------------------- */
/*  Dashboard / Transactions / Affiliate / Alerts                             */
/* -------------------------------------------------------------------------- */

export async function loadDashboardOverview() {
  const { user, profile, wallets } = await getUserProfileAndWallets();

  let transactions = [];
  if (DB_ID && TRANSACTIONS_TABLE_ID) {
    try {
      const res = await databases.listDocuments(DB_ID, TRANSACTIONS_TABLE_ID, [
        Query.equal("userId", user.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(10),
      ]);
      transactions = res.documents;
    } catch (err) {
      console.warn("loadDashboardOverview transactions error", err);
    }
  }

  return {
    user,
    profile,
    wallets,
    transactions,
  };
}

export async function loadWallets() {
  const { user } = await getUserProfileAndWallets();

  if (!DB_ID || !WALLETS_TABLE_ID) {
    throw new Error("Wallets are not configured.");
  }

  const res = await databases.listDocuments(DB_ID, WALLETS_TABLE_ID, [
    Query.equal("userId", user.$id),
    Query.orderAsc("type"),
  ]);

  return res.documents;
}

export async function loadTransactions() {
  const user = await getCurrentAccountSafe();
  if (!user) throw new Error("Not authenticated.");

  if (!DB_ID || !TRANSACTIONS_TABLE_ID) {
    throw new Error("Transactions are not configured.");
  }

  const res = await databases.listDocuments(DB_ID, TRANSACTIONS_TABLE_ID, [
    Query.equal("userId", user.$id),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);

  return res.documents;
}

export async function loadAffiliateOverview() {
  const user = await getCurrentAccountSafe();
  if (!user) throw new Error("Not authenticated.");

  if (!DB_ID) throw new Error("Database not configured.");

  let accountDoc = null;
  let referrals = [];
  let commissions = [];

  if (AFFILIATE_ACCOUNT_TABLE_ID) {
    try {
      const res = await databases.listDocuments(
        DB_ID,
        AFFILIATE_ACCOUNT_TABLE_ID,
        [Query.equal("userId", user.$id), Query.limit(1)]
      );
      accountDoc = res.documents[0] ?? null;
    } catch (err) {
      console.warn("loadAffiliateOverview account error", err);
    }
  }

  if (AFFILIATE_REFERRALS_TABLE_ID) {
    try {
      const res = await databases.listDocuments(
        DB_ID,
        AFFILIATE_REFERRALS_TABLE_ID,
        [Query.equal("userId", user.$id), Query.orderDesc("$createdAt")]
      );
      referrals = res.documents;
    } catch (err) {
      console.warn("loadAffiliateOverview referrals error", err);
    }
  }

  if (AFFILIATE_COMMISSIONS_TABLE_ID) {
    try {
      const res = await databases.listDocuments(
        DB_ID,
        AFFILIATE_COMMISSIONS_TABLE_ID,
        [Query.equal("userId", user.$id), Query.orderDesc("$createdAt")]
      );
      commissions = res.documents;
    } catch (err) {
      console.warn("loadAffiliateOverview commissions error", err);
    }
  }

  return { account: accountDoc, referrals, commissions };
}

export async function loadAlerts() {
  const user = await getCurrentAccountSafe();
  if (!user) throw new Error("Not authenticated.");

  if (!DB_ID || !ALERTS_TABLE_ID) {
    throw new Error("Alerts are not configured.");
  }

  const res = await databases.listDocuments(DB_ID, ALERTS_TABLE_ID, [
    Query.equal("userId", user.$id),
    Query.orderDesc("$createdAt"),
    Query.limit(50),
  ]);

  return res.documents;
}

/* -------------------------------------------------------------------------- */
/*  Investing / Giftcards (stubs matching your UI expectations)              */
/*  NOTE: These assume you will implement admin-side logic & permissions.    */
/* -------------------------------------------------------------------------- */

export async function createInvestOrder({ plan, amount, days }) {
  const user = await getCurrentAccountSafe();
  if (!user) throw new Error("Not authenticated.");

  if (!DB_ID || !TRANSACTIONS_TABLE_ID) {
    throw new Error("Investments are not configured.");
  }

  const now = new Date();
  const endAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const doc = await databases.createDocument(
    DB_ID,
    TRANSACTIONS_TABLE_ID,
    ID.unique(),
    {
      userId: user.$id,
      type: "INVEST",
      plan,
      amount,
      status: "PENDING",
      startedAt: now.toISOString(),
      endsAt: endAt.toISOString(),
    }
  );

  return doc;
}

export async function createGiftcardOrder({ direction, brand, amount }) {
  const user = await getCurrentAccountSafe();
  if (!user) throw new Error("Not authenticated.");

  if (!DB_ID || !TRANSACTIONS_TABLE_ID) {
    throw new Error("Giftcards are not configured.");
  }

  const doc = await databases.createDocument(
    DB_ID,
    TRANSACTIONS_TABLE_ID,
    ID.unique(),
    {
      userId: user.$id,
      type: direction === "BUY" ? "GIFTCARD_BUY" : "GIFTCARD_SELL",
      brand,
      amount,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    }
  );

  return doc;
}

// lib/api.js

import {
  account,
  databases,
  IDHelper,
  QueryHelper,
  DB_ID
} from "./appwrite";

/**
 * Central mapping of Appwrite collection IDs.
 * Make sure these match exactly what you created in Appwrite:
 *
 *  - user_profile
 *  - wallets
 *  - transactions
 *  - affiliate_account
 *  - affiliate_referrals
 *  - affiliate_commissions
 *  - alerts
 */
export const COLLECTIONS = {
  userProfiles: "user_profile",
  wallets: "wallets",
  transactions: "transactions",
  affiliateAccounts: "affiliate_account",
  affiliateReferrals: "affiliate_referrals",
  affiliateCommissions: "affiliate_commissions",
  alerts: "alerts"
};

/**
 * Get current logged-in user.
 * Returns `null` if not authenticated.
 */
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch (_err) {
    // Not logged in or network error
    return null;
  }
}

/**
 * Create default Day Trader profile & wallets for a new user.
 */
async function bootstrapUserData(user, fullName) {
  if (!DB_ID) return;

  // 1. Create / ensure profile
  try {
    const existing = await databases.listDocuments(DB_ID, COLLECTIONS.userProfiles, [
      QueryHelper.equal("userId", user.$id)
    ]);

    if (existing.total === 0) {
      await databases.createDocument(
        DB_ID,
        COLLECTIONS.userProfiles,
        IDHelper.unique(),
        {
          userId: user.$id,
          displayName: fullName || user.name || "",
          role: "user",
          kycStatus: "not_submitted",
          avatarUrl: ""
        }
      );
    }
  } catch (err) {
    console.warn("Could not create user profile:", err);
  }

  // 2. Create default wallets (main, trading, affiliate)
  try {
    const existingWallets = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.wallets,
      [QueryHelper.equal("userId", user.$id)]
    );

    if (existingWallets.total === 0) {
      const baseWallet = {
        userId: user.$id,
        balance: 0,
        currency: "USD",
        status: "active",
        investmentReturnsBalance: 0
      };

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.wallets,
        IDHelper.unique(),
        {
          ...baseWallet,
          type: "main"
        }
      );

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.wallets,
        IDHelper.unique(),
        {
          ...baseWallet,
          type: "trading"
        }
      );

      await databases.createDocument(
        DB_ID,
        COLLECTIONS.wallets,
        IDHelper.unique(),
        {
          ...baseWallet,
          type: "affiliate"
        }
      );
    }
  } catch (err) {
    console.warn("Could not create default wallets:", err);
  }
}

/**
 * Register new user with email & password.
 * Also bootstraps profile + default wallets via Appwrite database.
 *
 * params: { fullName, email, password }
 */
export async function registerUser(params) {
  const fullName = params.fullName || "";
  const { email, password } = params;

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  // 1. Create account
  const user = await account.create(
    IDHelper.unique(),
    email,
    password,
    fullName
  );

  // 2. Create session using the correct method for Web SDK
  try {
    await account.createEmailSession(email, password);
  } catch (err) {
    console.warn("Could not create session immediately after signup:", err);
  }

  // 3. Bootstrap DB profile + wallets (if DB configured)
  try {
    await bootstrapUserData(user, fullName);
  } catch (err) {
    console.warn("Bootstrap failed:", err);
  }

  return user;
}

/**
 * Login with email & password (Web SDK).
 * Returns created session.
 */
export async function loginWithEmailPassword(email, password) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  // IMPORTANT: for Appwrite JS Web SDK the method is createEmailSession, not createEmailPasswordSession
  const session = await account.createEmailSession(email, password);
  return session;
}

/**
 * Logout current session.
 */
export async function logoutUser() {
  try {
    await account.deleteSession("current");
  } catch (err) {
    console.error("Error logging out:", err);
    // swallow error – UI will still navigate away
  }
}

/**
 * Fetch user wallets (helper for dashboard, wallet page, etc.)
 */
export async function getUserWallets(userId) {
  if (!DB_ID) {
    throw new Error("Appwrite database is not configured.");
  }
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
    QueryHelper.equal("userId", userId)
  ]);
  return res.documents;
}

/**
 * Fetch user transactions (for /transactions and giftcard preview).
 * Optional filter: type (e.g. "deposit", "withdrawal", "investment", "giftcard_buy", "giftcard_sell").
 */
export async function getUserTransactions(userId, type) {
  if (!DB_ID) {
    throw new Error("Appwrite database is not configured.");
  }

  const queries = [QueryHelper.equal("userId", userId)];
  if (type) {
    queries.push(QueryHelper.equal("type", type));
  }

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.transactions,
    queries
  );

  return res.documents;
}

/**
 * Fetch basic affiliate account + metrics for /affiliate page.
 */
export async function getAffiliateAccount(userId) {
  if (!DB_ID) {
    throw new Error("Appwrite database is not configured.");
  }

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.affiliateAccounts,
    [QueryHelper.equal("userId", userId)]
  );

  return res.total > 0 ? res.documents[0] : null;
}

/**
 * Fetch affiliate-related documents (referrals + commissions) for overview.
 */
export async function getAffiliateOverview(userId) {
  if (!DB_ID) {
    throw new Error("Appwrite database is not configured.");
  }

  const [referrals, commissions] = await Promise.all([
    databases.listDocuments(
      DB_ID,
      COLLECTIONS.affiliateReferrals,
      [QueryHelper.equal("affiliateUserId", userId)]
    ),
    databases.listDocuments(
      DB_ID,
      COLLECTIONS.affiliateCommissions,
      [QueryHelper.equal("affiliateUserId", userId)]
    )
  ]);

  return {
    referrals: referrals.documents,
    commissions: commissions.documents
  };
}

/**
 * Fetch alerts (notifications) for /alerts page.
 */
export async function getUserAlerts(userId) {
  if (!DB_ID) {
    throw new Error("Appwrite database is not configured.");
  }

  const res = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.alerts,
    [QueryHelper.equal("userId", userId)]
  );

  return res.documents;
}

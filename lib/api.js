"use client";

import {
  account,
  databases,
  IDHelper,
  QueryHelper,
  DB_ID
} from "./appwrite";

export const COLLECTIONS = {
  userProfiles: "user_profile",
  wallets: "wallets",
  transactions: "transactions",
  affiliateAccounts: "affiliate_account",
  affiliateReferrals: "affiliate_referrals",
  affiliateCommissions: "affiliate_commissions",
  alerts: "alerts"
};

// ---- Auth Helpers ----

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch (err) {
    console.error("getCurrentUser error", err);
    return null;
  }
}

// Called after signup; sets profile, wallets, and affiliate referral if code exists
export async function initUserAfterSignup(referralCode) {
  const user = await getCurrentUser();
  if (!user || !DB_ID) return null;

  const userId = user.$id;

  // 1. Check if profile exists
  const existing = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.userProfiles,
    [QueryHelper.equal("userId", userId)]
  );

  if (existing.total > 0) {
    return existing.documents[0];
  }

  const profileData = {
    userId,
    displayName: user.name || "",
    role: "user"
  };

  // 2. Affiliate referral
  if (referralCode) {
    try {
      const aff = await databases.listDocuments(
        DB_ID,
        COLLECTIONS.affiliateAccounts,
        [QueryHelper.equal("code", referralCode)]
      );

      if (aff.total > 0) {
        const affiliateAccount = aff.documents[0];
        profileData.referredByCode = referralCode;

        const existingRef = await databases.listDocuments(
          DB_ID,
          COLLECTIONS.affiliateReferrals,
          [QueryHelper.equal("referredUserId", userId)]
        );

        if (existingRef.total === 0) {
          await databases.createDocument(
            DB_ID,
            COLLECTIONS.affiliateReferrals,
            IDHelper.unique(),
            {
              affiliateUserId: affiliateAccount.userId,
              affiliateCode: referralCode,
              referredUserId: userId,
              status: "signed_up",
              signedUpAt: new Date().toISOString()
            }
          );
        }
      }
    } catch (err) {
      console.error("Error linking affiliate referral", err);
    }
  }

  // 3. Create profile
  const profile = await databases.createDocument(
    DB_ID,
    COLLECTIONS.userProfiles,
    IDHelper.unique(),
    profileData
  );

  // 4. Create default wallets
  try {
    await createDefaultWalletsForUser(userId);
  } catch (err) {
    console.error("Error creating default wallets", err);
  }

  return profile;
}

// On login, ensure profile/wallets exist
export async function bootstrapUserAfterLogin() {
  try {
    await initUserAfterSignup(null);
  } catch (err) {
    console.error("bootstrapUserAfterLogin error", err);
  }
}

export async function createDefaultWalletsForUser(userId) {
  if (!DB_ID) return;

  const existing = await databases.listDocuments(
    DB_ID,
    COLLECTIONS.wallets,
    [QueryHelper.equal("userId", userId)]
  );
  if (existing.total > 0) return;

  const base = [
    { type: "main", currency: "USD", isDefault: true },
    { type: "affiliate", currency: "USD", isDefault: false }
  ];

  await Promise.all(
    base.map((w) =>
      databases.createDocument(
        DB_ID,
        COLLECTIONS.wallets,
        IDHelper.unique(),
        {
          userId,
          ...w,
          balance: 0,
          status: "active"
        }
      )
    )
  );
}

// ---- Dashboard data ----

export async function fetchDashboardOverview() {
  const user = await getCurrentUser();
  if (!user || !DB_ID) {
    return {
      user: null,
      profile: null,
      wallets: [],
      affiliate: null
    };
  }

  const userId = user.$id;

  try {
    const [profiles, wallets, affiliateAccounts, commissions] =
      await Promise.all([
        databases.listDocuments(DB_ID, COLLECTIONS.userProfiles, [
          QueryHelper.equal("userId", userId)
        ]),
        databases.listDocuments(DB_ID, COLLECTIONS.wallets, [
          QueryHelper.equal("userId", userId)
        ]),
        databases.listDocuments(DB_ID, COLLECTIONS.affiliateAccounts, [
          QueryHelper.equal("userId", userId)
        ]),
        databases.listDocuments(DB_ID, COLLECTIONS.affiliateCommissions, [
          QueryHelper.equal("affiliateUserId", userId)
        ])
      ]);

    const profile = profiles.total > 0 ? profiles.documents[0] : null;
    const affiliate = affiliateAccounts.total > 0
      ? affiliateAccounts.documents[0]
      : null;

    const totalAffiliateCommission = commissions.documents.reduce(
      (sum, c) => sum + (c.amount || 0),
      0
    );

    return {
      user,
      profile,
      wallets: wallets.documents,
      affiliate: affiliate
        ? {
            ...affiliate,
            stats: {
              totalCommission: totalAffiliateCommission
            }
          }
        : null
    };
  } catch (err) {
    console.error("fetchDashboardOverview error", err);
    return {
      user,
      profile: null,
      wallets: [],
      affiliate: null
    };
  }
}

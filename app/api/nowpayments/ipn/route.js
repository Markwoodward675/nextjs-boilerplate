import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const USERS = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";
const WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const TRANSACTIONS = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

const AFF_ACC =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account";
const AFF_COM =
  process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID || "affiliate_commissions";

function nowISO() {
  return new Date().toISOString();
}

// Appwrite "enum" columns must match your enum values in Console.
// These are the most likely values based on your UI:
const WALLET_TYPES = {
  MAIN: "main",
  TRADING: "trading",
  AFFILIATE: "affiliate",
};

const TX_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  INVEST: "invest",
  TRADE: "trade",
  GIFTCARD_BUY: "giftcard_buy",
  GIFTCARD_SELL: "giftcard_sell",
  ADMIN_ADJUSTMENT: "admin_adjustment",
  COMMISSION: "commission",
};

const COMMISSION_STATUS = {
  PENDING: "pending",
  PAID: "paid",
};

async function getMainWallet(db, userId) {
  const res = await db.listDocuments(DB_ID, WALLETS, [
    `equal("userId", "${userId}")`,
    `equal("currencyType", "${WALLET_TYPES.MAIN}")`,
    "limit(1)",
  ]);
  const w = res.documents?.[0];
  if (!w) throw new Error("Main wallet not found. Create wallets for this user first.");
  return w;
}

async function creditWallet(db, walletDoc, amount) {
  const newBalance = Number(walletDoc.balance || 0) + Number(amount || 0);
  return db.updateDocument(DB_ID, WALLETS, walletDoc.$id, {
    balance: newBalance,
    updatedDate: nowISO(),
  });
}

async function createTransaction(db, ID, { userId, walletId, amount, currencyType, transactionType }) {
  const txId = ID.unique();
  return db.createDocument(DB_ID, TRANSACTIONS, txId, {
    transactionId: txId, // required Size:36
    userId,              // required Size:36
    walletId,            // required Size:36
    amount: Number(amount || 0),
    currencyType,        // required enum
    transactionType,     // required enum
    transactionDate: nowISO(),
  });
}

/**
 * Affiliate commission logic (schema-aligned):
 * - We need an affiliate account for the referrer.
 * - We also need a way to know "who referred this user".
 *
 * Recommended: store `referrerAffiliateId` (integer) in user_profile.
 * If you don't have it, this will safely no-op.
 */
async function awardAffiliateCommissionIfAny(db, ID, depositorUserId, depositAmount) {
  // Try to read depositor profile and look for referrerAffiliateId
  let profile = null;
  try {
    profile = await db.getDocument(DB_ID, USERS, depositorUserId);
  } catch {
    return null;
  }

  const refId = Number(profile?.referrerAffiliateId || 0); // you should add this int field if missing
  if (!refId) return null;

  const accRes = await db.listDocuments(DB_ID, AFF_ACC, [
    `equal("affiliateId", ${refId})`,
    "limit(1)",
  ]);
  const acc = accRes.documents?.[0];
  if (!acc) return null;

  const rate = Number(acc.commissionRate || 0); // percent
  const commissionAmount = Math.max(0, (Number(depositAmount || 0) * rate) / 100);

  // find affiliate wallet for the affiliate user
  const walletRes = await db.listDocuments(DB_ID, WALLETS, [
    `equal("userId", "${acc.userId}")`,
    `equal("currencyType", "${WALLET_TYPES.AFFILIATE}")`,
    "limit(1)",
  ]);
  const affWallet = walletRes.documents?.[0];
  if (!affWallet) return null;

  // create commission record
  const commissionId = crypto.randomUUID(); // Size:64 ok
  await db.createDocument(DB_ID, AFF_COM, ID.unique(), {
    commissionId,
    walletId: String(affWallet.walletId || affWallet.$id), // required Size:64
    commissionAmount: Number(commissionAmount),
    commissionCurrency: "USD",
    commissionDate: nowISO(),
    paymentStatus: COMMISSION_STATUS.PENDING,

    // optional fields in your schema:
    affiliateId: refId,
    userId: acc.userId,
  });

  // OPTIONAL: credit affiliate wallet immediately OR keep pending.
  // If you want to credit immediately:
  // await creditWallet(db, affWallet, commissionAmount);
  // await createTransaction(db, ID, {
  //   userId: acc.userId,
  //   walletId: affWallet.walletId || affWallet.$id,
  //   amount: commissionAmount,
  //   currencyType: affWallet.currencyType,
  //   transactionType: TX_TYPES.COMMISSION,
  // });

  // update totals
  await db.updateDocument(DB_ID, AFF_ACC, acc.$id, {
    totalEarned: Number(acc.totalEarned || 0) + commissionAmount,
    lastPaymentDate: null,
  });

  return { referrerUserId: acc.userId, commissionAmount };
}

export async function POST(req) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") || "";
  const secret = process.env.NOWPAYMENTS_IPN_SECRET || "";

  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing NOWPAYMENTS_IPN_SECRET" }, { status: 500 });
  }

  const check = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (check !== signature) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);

  // order_id format we recommend: DT-<userId>-<timestamp>
  const orderId = String(event?.order_id || "");
  const parts = orderId.split("-");
  const userId = parts.length >= 3 ? parts[1] : "";

  const paymentStatus = String(event?.payment_status || "");
  const amount = Number(event?.price_amount || 0);

  if (!userId || !amount) return NextResponse.json({ ok: true });

  // Only finalize on confirmed/finished
  if (!["confirmed", "finished"].includes(paymentStatus)) {
    return NextResponse.json({ ok: true });
  }

  const { db, ID } = getAdminClient();

  // Get main wallet
  const mainWallet = await getMainWallet(db, userId);

  // Credit wallet
  await creditWallet(db, mainWallet, amount);

  // Create transaction (schema-aligned)
  await createTransaction(db, ID, {
    userId,
    walletId: String(mainWallet.walletId || mainWallet.$id),
    amount,
    currencyType: mainWallet.currencyType,
    transactionType: TX_TYPES.DEPOSIT,
  });

  // Affiliate commission (optional if you add referrerAffiliateId to user_profile)
  await awardAffiliateCommissionIfAny(db, ID, userId, amount).catch(() => null);

  return NextResponse.json({ ok: true });
}

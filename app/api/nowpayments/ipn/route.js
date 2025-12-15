import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const USERS = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";
const WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const TX = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";
const ALERTS = process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";

const AFF_ACC = process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_ACCOUNT_COLLECTION_ID || "affiliate_account";
const AFF_REF = process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_REFERRALS_COLLECTION_ID || "affiliate_referrals";
const AFF_COM = process.env.NEXT_PUBLIC_APPWRITE_AFFILIATE_COMMISSIONS_COLLECTION_ID || "affiliate_commissions";

function nowISO() {
  return new Date().toISOString();
}

async function createAlertAdmin(db, userId, title, body, kind = "info") {
  return db.createDocument(DB_ID, ALERTS, "unique()", {
    userId,
    title,
    body,
    kind,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

async function createTxAdmin(db, userId, tx) {
  return db.createDocument(DB_ID, TX, "unique()", {
    userId,
    type: tx.type || "activity",
    amount: Number(tx.amount || 0),
    status: tx.status || "completed",
    meta: JSON.stringify(tx.meta || {}),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

async function creditMainWalletAdmin(db, userId, amount) {
  // find main wallet for this user
  const wallets = await db.listDocuments(DB_ID, WALLETS, [
    `equal("userId", "${userId}")`,
    `equal("currencyType", "main")`,
    "limit(1)",
  ]);

  const w = wallets.documents?.[0];
  if (!w) throw new Error("Main wallet not found for user");

  const newBal = Number(w.balance || 0) + Number(amount || 0);

  return db.updateDocument(DB_ID, WALLETS, w.$id, {
    balance: newBal,
    updatedDate: nowISO(),
  });
}

async function awardAffiliateCommissionAdmin(db, userId, depositAmount) {
  // Find referral record for this user
  const refRes = await db.listDocuments(DB_ID, AFF_REF, [
    `equal("referredUserId", "${userId}")`,
    "limit(1)",
  ]);
  const ref = refRes.documents?.[0];
  if (!ref?.referrerAffiliateId) return null;

  const affiliateId = ref.referrerAffiliateId; // likely integer in your schema

  // Find affiliate account
  const accRes = await db.listDocuments(DB_ID, AFF_ACC, [
    `equal("affiliateId", ${Number(affiliateId)})`,
    "limit(1)",
  ]);
  const acc = accRes.documents?.[0];
  if (!acc) return null;

  const rate = Number(acc.commissionRate || 0);
  const commission = Math.max(0, (Number(depositAmount || 0) * rate) / 100);

  await db.createDocument(DB_ID, AFF_COM, "unique()", {
    commissionId: crypto.randomUUID(),
    affiliateId: String(affiliateId),
    walletId: "", // optional
    commissionAmount: commission,
    commissionCurrency: "USD",
    commissionDate: nowISO(),
    paymentStatus: "pending",
  });

  await db.updateDocument(DB_ID, AFF_ACC, acc.$id, {
    totalEarned: Number(acc.totalEarned || 0) + commission,
    updatedAt: nowISO(),
  });

  return { affiliateId, commission, affiliateUserId: acc.userId };
}

export async function POST(req) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") || "";
  const secret = process.env.NOWPAYMENTS_IPN_SECRET || "";

  if (!secret) return NextResponse.json({ ok: false, error: "Missing IPN secret" }, { status: 500 });

  const check = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (check !== signature) return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(raw);

  // order_id format: DT-<userId>-<timestamp>
  const orderId = String(event?.order_id || "");
  const parts = orderId.split("-");
  const userId = parts.length >= 3 ? parts[1] : "";

  const status = String(event?.payment_status || "");
  const amount = Number(event?.price_amount || 0);
  const currency = String(event?.price_currency || "usd");

  // only finalize for confirmed/finished
  if (!userId || !amount) return NextResponse.json({ ok: true });

  if (!["confirmed", "finished"].includes(status)) {
    return NextResponse.json({ ok: true });
  }

  const { db } = getAdminClient();

  // idempotency: if you already recorded a completed tx with this order id, skip
  const txRes = await db.listDocuments(DB_ID, TX, [
    `equal("userId", "${userId}")`,
    `search("meta", "${orderId}")`,
    "limit(1)",
  ]);
  if (txRes.documents?.length) return NextResponse.json({ ok: true });

  // credit wallet
  await creditMainWalletAdmin(db, userId, amount);

  // transaction record
  await createTxAdmin(db, userId, {
    type: "deposit",
    amount,
    status: "completed",
    meta: { provider: "nowpayments", status, orderId, currency },
  });

  // affiliate commission
  const aff = await awardAffiliateCommissionAdmin(db, userId, amount).catch(() => null);
  if (aff?.affiliateUserId) {
    await createAlertAdmin(
      db,
      aff.affiliateUserId,
      "Affiliate commission earned",
      `Commission credited: $${aff.commission.toFixed(2)} (pending payout).`,
      "info"
    );
  }

  // alert to depositor
  await createAlertAdmin(db, userId, "Deposit confirmed", `Deposit received: $${amount.toFixed(2)}.`, "info");

  return NextResponse.json({ ok: true });
}

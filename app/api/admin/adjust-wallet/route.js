import { NextResponse } from "next/server";
import { getAdminClient, requireAdminKey } from "../../../../lib/appwriteAdmin";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const TRANSACTIONS = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

const TX_TYPES = {
  ADMIN_ADJUSTMENT: "admin_adjustment",
};

export async function POST(req) {
  try {
    requireAdminKey(req);

    const { walletDocId, delta } = await req.json();
    if (!walletDocId || typeof delta !== "number") {
      return NextResponse.json({ error: "Missing walletDocId or delta" }, { status: 400 });
    }

    const { db, ID } = getAdminClient();

    const w = await db.getDocument(DB_ID, WALLETS, walletDocId);
    const newBal = Number(w.balance || 0) + Number(delta);

    const updated = await db.updateDocument(DB_ID, WALLETS, walletDocId, {
      balance: newBal,
      updatedDate: new Date().toISOString(),
    });

    const txId = ID.unique();
    await db.createDocument(DB_ID, TRANSACTIONS, txId, {
      transactionId: txId,
      userId: w.userId,
      walletId: String(w.walletId || w.$id),
      amount: Math.abs(Number(delta)),
      currencyType: w.currencyType,
      transactionType: TX_TYPES.ADMIN_ADJUSTMENT,
      transactionDate: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Admin error" }, { status: e.status || 500 });
  }
}

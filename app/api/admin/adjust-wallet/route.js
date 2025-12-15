import { NextResponse } from "next/server";
import { getAdminClient, requireAdminKey } from "../../../../lib/appwriteAdmin";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const WALLETS = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
const TX = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";

export async function POST(req) {
  try {
    requireAdminKey(req);
    const { walletDocId, delta, reason = "admin_adjustment" } = await req.json();
    if (!walletDocId || typeof delta !== "number") {
      return NextResponse.json({ error: "Missing walletDocId/delta" }, { status: 400 });
    }

    const { db } = getAdminClient();

    const w = await db.getDocument(DB_ID, WALLETS, walletDocId);
    const newBal = Number(w.balance || 0) + Number(delta);

    const updated = await db.updateDocument(DB_ID, WALLETS, walletDocId, {
      balance: newBal,
      updatedDate: new Date().toISOString(),
    });

    await db.createDocument(DB_ID, TX, "unique()", {
      userId: w.userId,
      type: "admin_adjustment",
      amount: Math.abs(delta),
      status: "completed",
      meta: JSON.stringify({ reason, walletDocId, delta }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Admin error" }, { status: e.status || 500 });
  }
}

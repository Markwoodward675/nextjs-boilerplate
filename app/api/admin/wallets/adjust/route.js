import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
}
function transactionsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";
}
function alertsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
}

export async function POST(req) {
  try {
    await requireAdminAuth(req);

    const body = await req.json().catch(() => ({}));
    const walletDocId = String(body.walletId || "").trim();
    const delta = Number(body.delta);
    const note = String(body.note || "").slice(0, 500);

    if (!walletDocId) return NextResponse.json({ error: "Missing walletId." }, { status: 400 });
    if (!Number.isFinite(delta)) return NextResponse.json({ error: "Invalid delta." }, { status: 400 });

    const { db, DATABASE_ID, ID } = getAdmin();

    const w = await db.getDocument(DATABASE_ID, walletsCollectionId(), walletDocId);
    const current = Number(w.balance || 0);
    const next = Math.max(0, current + delta);

    await db.updateDocument(DATABASE_ID, walletsCollectionId(), walletDocId, {
      balance: next,
      updatedDate: new Date().toISOString(),
    });

    // Create transaction record
    const txId = crypto.randomUUID();
    await db.createDocument(DATABASE_ID, transactionsCollectionId(), ID.unique(), {
      transactionId: txId,
      userId: String(w.userId),
      walletId: String(w.walletId || walletDocId),
      amount: Math.abs(delta),
      currencyType: String(w.currencyType || "USD"),
      transactionType: "admin_adjustment",
      transactionDate: new Date().toISOString(),
      status: "completed",
      meta: JSON.stringify({ delta, note }),
      type: "admin_adjustment",
    });

    // Alert
    await db.createDocument(DATABASE_ID, alertsCollectionId(), ID.unique(), {
      alertId: crypto.randomUUID(),
      alertTitle: "Wallet adjustment",
      alertMessage: `An admin adjusted your wallet by ${delta}. ${note ? `Note: ${note}` : ""}`,
      severity: "medium",
      alertCategory: "admin",
      userId: String(w.userId),
      isResolved: false,
      title: "Wallet adjustment",
      body: `An admin adjusted your wallet by ${delta}. ${note ? `Note: ${note}` : ""}`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, balance: next });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

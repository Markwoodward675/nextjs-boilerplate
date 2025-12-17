import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function alertsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
}
function transactionsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "transactions";
}

export async function GET(req) {
  try {
    await requireAdminAuth(req);
    const { db, DATABASE_ID, Query } = getAdmin();

    const [alerts, tx] = await Promise.all([
      db.listDocuments(DATABASE_ID, alertsCollectionId(), [Query.orderDesc("$createdAt"), Query.limit(10)]).catch(() => ({ documents: [] })),
      db.listDocuments(DATABASE_ID, transactionsCollectionId(), [Query.orderDesc("$createdAt"), Query.limit(10)]).catch(() => ({ documents: [] })),
    ]);

    return NextResponse.json({
      now: new Date().toISOString(),
      tail: {
        alerts: alerts?.documents || [],
        transactions: tx?.documents || [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

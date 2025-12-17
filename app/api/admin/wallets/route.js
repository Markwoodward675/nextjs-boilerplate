import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function walletsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";
}

export async function GET(req) {
  try {
    await requireAdminAuth(req);
    const { db, DATABASE_ID, Query } = getAdmin();

    const r = await db.listDocuments(DATABASE_ID, walletsCollectionId(), [
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);

    return NextResponse.json({ wallets: r?.documents || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

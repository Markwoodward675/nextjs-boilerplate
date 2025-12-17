import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function alertsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
}

export async function GET(req) {
  try {
    await requireAdminAuth(req);
    const { db, DATABASE_ID, Query } = getAdmin();

    const r = await db.listDocuments(DATABASE_ID, alertsCollectionId(), [
      Query.orderDesc("$createdAt"),
      Query.limit(60),
    ]);

    return NextResponse.json({ alerts: r?.documents || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

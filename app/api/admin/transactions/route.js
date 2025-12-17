import { NextResponse } from "next/server";
import { getAdmin, requireAdminKey } from "@/lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    requireAdminKey(req);
    const { db, DATABASE_ID, Query } = getAdmin();

    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") || "").trim();
    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });

    const r = await db.listDocuments(DATABASE_ID, "transactions", [
      Query.equal("userId", [userId]),
      Query.orderDesc("$createdAt"),
      Query.limit(200),
    ]);

    return NextResponse.json({ transactions: r?.documents || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to load transactions." },
      { status: e?.status || 500 }
    );
  }
}

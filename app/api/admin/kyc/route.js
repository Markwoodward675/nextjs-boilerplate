import { NextResponse } from "next/server";
import { getAdmin, requireAdminKey } from "@/lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    requireAdminKey(req);
    const { db, DATABASE_ID, Query } = getAdmin();

    // show most recent non-approved (or missing) KYC statuses
    const r = await db.listDocuments(DATABASE_ID, "profiles", [
      Query.orderDesc("$createdAt"),
      Query.limit(50),
    ]);

    const items = (r?.documents || []).filter((p) => {
      const s = String(p?.kycStatus || "").toLowerCase();
      return !s || s !== "approved";
    });

    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to load KYC list." },
      { status: e?.status || 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function profilesCollectionId() {
  return (
    process.env.APPWRITE_PROFILES_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
    "profiles"
  );
}

export async function POST(req) {
  try {
    await requireAdminAuth(req);
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || "").trim();
    const status = String(body.status || "").trim().toLowerCase();

    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const { db, DATABASE_ID, Query } = getAdmin();

    // find profile doc by userId
    const found = await db.listDocuments(DATABASE_ID, profilesCollectionId(), [
      Query.equal("userId", userId),
      Query.limit(1),
    ]);

    const doc = found?.documents?.[0];
    if (!doc) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const patch = {
      kycStatus: status,
      verifiedAt: status === "approved" ? new Date().toISOString() : null,
    };

    await db.updateDocument(DATABASE_ID, profilesCollectionId(), doc.$id, patch);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}

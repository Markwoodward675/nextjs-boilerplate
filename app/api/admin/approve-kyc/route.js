import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    requireAdminAuth(req);
    const { db, DATABASE_ID, ID, Query } = getAdmin();

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const approve = Boolean(body?.approve);

    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });

    // Find profile doc by userId
    const found = await db.listDocuments(DATABASE_ID, "profiles", [
      Query.equal("userId", [userId]),
      Query.limit(1),
    ]);

    const doc = found?.documents?.[0];
    if (!doc?.$id) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const newStatus = approve ? "approved" : "rejected";

    await db.updateDocument(DATABASE_ID, "profiles", doc.$id, {
      kycStatus: newStatus,
    });

    await db.createDocument(DATABASE_ID, "alerts", ID.unique(), {
      alertId: `kyc_${Date.now()}`,
      title: approve ? "KYC Approved" : "KYC Rejected",
      body: approve
        ? "Your identity verification has been approved."
        : "Your identity verification was rejected. Please resubmit with clearer documents.",
      alertTitle: approve ? "KYC Approved" : "KYC Rejected",
      alertMessage: approve
        ? "Your identity verification has been approved."
        : "Your identity verification was rejected. Please resubmit with clearer documents.",
      severity: approve ? "low" : "high",
      userId,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to update KYC." },
      { status: e?.status || 500 }
    );
  }
}

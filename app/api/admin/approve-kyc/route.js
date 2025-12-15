export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, ADMIN_DB_ID, requireAdminKey } from "../../../../lib/appwriteAdmin";
import { Query } from "node-appwrite";

// Change this to your real collection ID
const COL_PROFILES = process.env.NEXT_PUBLIC_COL_PROFILES || "profiles";

export async function POST(req) {
  try {
    requireAdminKey(req);

    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const status = String(body?.status || "approved").trim().toLowerCase(); // approved/rejected/pending

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    // Assumes profile docId = userId (as in our bootstrap code)
    const updated = await adminDb.updateDocument(ADMIN_DB_ID, COL_PROFILES, userId, {
      kycStatus: status,
      kycUpdatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, profile: updated });
  } catch (e) {
    const status = e?.status || 500;
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to approve KYC" },
      { status }
    );
  }
}

import { NextResponse } from "next/server";
import { getAdmin } from "../../../../lib/appwriteAdmin";
import { ID, Query } from "node-appwrite";

const COL_USER_PROFILE = "user_profile";

export async function POST(req) {
  try {
    const { db, DATABASE_ID } = getAdmin();
    const body = await req.json();
    const { userId, fullName, country, address } = body || {};
    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });

    // Use docId = userId (consistent)
    const exists = await db.getDocument(DATABASE_ID, COL_USER_PROFILE, userId).catch(() => null);
    if (!exists) {
      await db.createDocument(DATABASE_ID, COL_USER_PROFILE, userId, {
        userId,
        fullName: fullName || "",
        country: country || "",
        address: address || "",
        email: "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.updateDocument(DATABASE_ID, COL_USER_PROFILE, userId, {
        fullName: fullName || exists.fullName || "",
        country: country || exists.country || "",
        address: address || exists.address || "",
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

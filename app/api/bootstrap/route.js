// app/api/bootstrap/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });

    const { db, users, DATABASE_ID } = getAdminClient();
    const u = await users.get(userId);

    const USER_PROFILE_COL =
      process.env.APPWRITE_USERS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
      "user_profile";

    const now = new Date().toISOString();

    // Ensure profile exists (docId=userId)
    try {
      await db.getDocument(DATABASE_ID, USER_PROFILE_COL, userId);
    } catch {
      await db.createDocument(DATABASE_ID, USER_PROFILE_COL, userId, {
        userId,
        email: u?.email || "",
        fullName: u?.name || "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Bootstrap failed." }, { status: 500 });
  }
}

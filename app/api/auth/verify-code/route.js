import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin } from "../../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const code = String(body?.code || "").trim();

    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ ok: false, error: "Code must be 6 digits." }, { status: 400 });
    }

    const { db, users, DATABASE_ID } = getAdmin();

    // ensure user exists
    const u = await users.get(userId);
    if (!u?.$id) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });

    const VERIFY_COL = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";

    // ✅ Single source of truth:
    const USER_PROFILE_COL = process.env.APPWRITE_USERS_COLLECTION_ID || "user_profile";

    const verifyDoc = await db.getDocument(DATABASE_ID, VERIFY_COL, userId);

    if (verifyDoc.used) {
      return NextResponse.json({ ok: false, error: "Code already used. Send a new one." }, { status: 400 });
    }
    if (String(verifyDoc.code) !== code) {
      return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 400 });
    }

    await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, {
      used: true,
      usedAt: new Date().toISOString(),
    });

    // ✅ Update ONLY fields that exist in your user_profile schema
    const patch = {
      verificationCodeVerified: true,
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.updateDocument(DATABASE_ID, USER_PROFILE_COL, userId, patch);
    } catch {
      // create minimal user_profile doc (docId = userId)
      await db.createDocument(DATABASE_ID, USER_PROFILE_COL, userId, {
        userId,
        email: u.email || null,
        fullName: u.name || null,
        verificationCodeVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Verify failed." }, { status: 500 });
  }
}

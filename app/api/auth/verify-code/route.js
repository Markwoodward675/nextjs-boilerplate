import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const code = String(body?.code || "").trim();

    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ ok: false, error: "Code must be 6 digits." }, { status: 400 });

    const { db, users, DB_ID } = getAdminClient();
    await users.get(userId);

    const VERIFY_COL = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";
    const PROFILE_COL = process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles";

    const doc = await db.getDocument(DB_ID, VERIFY_COL, userId);

    if (doc.used) return NextResponse.json({ ok: false, error: "Code already used. Send a new one." }, { status: 400 });
    if (String(doc.code) !== code) return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 400 });

    await db.updateDocument(DB_ID, VERIFY_COL, userId, { used: true, usedAt: new Date().toISOString() });

    // Mark verified
    try {
      await db.updateDocument(DB_ID, PROFILE_COL, userId, {
        verificationCodeVerified: true,
        verifiedAt: new Date().toISOString(),
      });
    } catch {
      await db.createDocument(DB_ID, PROFILE_COL, userId, {
        userId,
        verificationCodeVerified: true,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Verify failed." }, { status: 500 });
  }
}

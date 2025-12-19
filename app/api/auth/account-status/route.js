import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminFindUserByEmail, getAdminClient } from "../../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });

    const u = await adminFindUserByEmail(email);
    if (!u?.$id) return NextResponse.json({ ok: true, exists: false, verified: false });

    const { db, DATABASE_ID } = getAdminClient();

    const USER_PROFILE_COL =
      process.env.APPWRITE_USERS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
      process.env.APPWRITE_PROFILES_COLLECTION_ID ||
      "user_profile";

    try {
      const profile = await db.getDocument(DATABASE_ID, USER_PROFILE_COL, u.$id);
      const verified = Boolean(profile?.verificationCodeVerified);
      return NextResponse.json({ ok: true, exists: true, verified });
    } catch {
      // user exists but profile doc missing => treat as unverified
      return NextResponse.json({ ok: true, exists: true, verified: false });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Status check failed." }, { status: 500 });
  }
}

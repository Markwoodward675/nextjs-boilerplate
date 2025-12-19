// app/api/auth/account-status/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient, Query } from "../../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });

    const { db, users, DATABASE_ID } = getAdminClient();

    const USER_PROFILE_COL =
      process.env.APPWRITE_USERS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
      "user_profile";

    // Try find profile by email
    const prof = await db.listDocuments(DATABASE_ID, USER_PROFILE_COL, [
      Query.equal("email", email),
      Query.limit(1),
    ]);

    const profile = prof?.documents?.[0] || null;
    if (profile) {
      return NextResponse.json(
        { ok: true, exists: true, verified: Boolean(profile.verificationCodeVerified), userId: profile.userId || profile.$id },
        { status: 200 }
      );
    }

    // Fallback: find user by email, then doc by id
    const uRes = await users.list([Query.equal("email", email)], 1, 0);
    const u = uRes?.users?.[0] || null;
    if (!u?.$id) return NextResponse.json({ ok: true, exists: false }, { status: 200 });

    try {
      const doc = await db.getDocument(DATABASE_ID, USER_PROFILE_COL, u.$id);
      return NextResponse.json(
        { ok: true, exists: true, verified: Boolean(doc.verificationCodeVerified), userId: u.$id },
        { status: 200 }
      );
    } catch {
      return NextResponse.json({ ok: true, exists: true, verified: false, userId: u.$id }, { status: 200 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Status lookup failed." }, { status: 500 });
  }
}

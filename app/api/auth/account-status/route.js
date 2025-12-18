// app/api/auth/account-status/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });

    const { db, users, DATABASE_ID } = getAdminClient();

    // Find user by email (admin)
    const found = await users.list([Query.equal("email", email), Query.limit(1)]);
    const u = found?.users?.[0];
    if (!u?.$id) {
      return NextResponse.json({ exists: false, verified: false }, { status: 200 });
    }

    const userId = u.$id;

    const USER_PROFILE_COL = process.env.APPWRITE_USERS_COLLECTION_ID || "user_profile";

    // Check user_profile doc by docId=userId first
    let verified = false;
    try {
      const prof = await db.getDocument(DATABASE_ID, USER_PROFILE_COL, userId);
      verified = Boolean(prof?.verificationCodeVerified);
    } catch {
      verified = false;
    }

    return NextResponse.json({ exists: true, userId, verified }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Unable to check status." }, { status: 500 });
  }
}

import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin, ID, Query } from "../../../lib/appwriteAdmin";

const USER_PROFILE_COL =
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  "user_profile";

function nowISO() {
  return new Date().toISOString();
}

function uuid36() {
  return crypto.randomUUID();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    }

    const { db, users, DATABASE_ID } = getAdmin();

    // Always fetch the real user from Appwrite Admin (don’t trust client for email/name)
    const u = await users.get(userId);
    const email = u?.email || "";
    const name = u?.name || "";

    const now = nowISO();

    // docId = Appwrite Account ID, but inside we keep a stable 36-char uuid as `user_profile.userId`
    let profile = null;

    try {
      profile = await db.getDocument(DATABASE_ID, USER_PROFILE_COL, userId);

      // Ensure 36 UUID exists for wallets/transactions usage
      if (!profile?.userId || String(profile.userId).length < 32) {
        profile = await db.updateDocument(DATABASE_ID, USER_PROFILE_COL, userId, {
          userId: uuid36(),
          updatedAt: now,
        });
      }
    } catch {
      profile = await db.createDocument(DATABASE_ID, USER_PROFILE_COL, userId, {
        userId: uuid36(),
        email,
        fullName: name,
        role: "user",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Return a minimal safe user object
    return NextResponse.json(
      { ok: true, user: { $id: userId, email, name }, profile },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Bootstrap failed." }, { status: 500 });
  }
}

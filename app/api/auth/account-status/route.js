import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getAdmin } from "../../../../lib/appwriteAdmin";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });
    }

    const { db, DATABASE_ID } = getAdmin();

    const PROFILE_COL =
      process.env.APPWRITE_PROFILES_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
      "profiles";

    const r = await db.listDocuments(DATABASE_ID, PROFILE_COL, [
      Query.equal("email", [email]),
      Query.limit(1),
    ]);

    const profile = r?.documents?.[0] || null;

    return NextResponse.json(
      {
        ok: true,
        exists: !!profile,
        verified: !!profile?.verificationCodeVerified,
        userId: profile?.userId || null,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unable to check account status." },
      { status: 500 }
    );
  }
}
